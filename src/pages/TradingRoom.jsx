import { useState, useCallback, useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import CandlestickChart from '../components/trading/CandlestickChart'
import TradePanel from '../components/trading/TradePanel'
import Leaderboard from '../components/trading/Leaderboard'
import TournamentChat from '../components/chat/TournamentChat'
import tournamentStore from '../services/tournamentStore'
import { useNotification } from '../contexts/NotificationContext'
import api from '../services/api'

export default function TradingRoom() {
  const { id } = useParams()
  const { notify } = useNotification()
  const [balance, setBalance] = useState(10000)
  const [currentPrice, setCurrentPrice] = useState(67500)
  const [trades, setTrades] = useState([])
  const [activePanel, setActivePanel] = useState('trade')
  const [tournamentTime, setTournamentTime] = useState(null) // null = not loaded yet
  const [tournament, setTournament] = useState(null)
  const timerStarted = useRef(false)

  // Active Trade states managed at the page level
  const [activeTrade, setActiveTrade] = useState(null)
  const [countdown, setCountdown] = useState(0)
  const [lastResult, setLastResult] = useState(null)

  const currentPriceRef = useRef(currentPrice)
  const activeTradeRef = useRef(activeTrade)

  useEffect(() => {
    currentPriceRef.current = currentPrice
  }, [currentPrice])

  useEffect(() => {
    activeTradeRef.current = activeTrade
  }, [activeTrade])

  // Load tournament and user participant data
  useEffect(() => {
    tournamentStore.getById(id).then(t => {
      if (t) {
        setTournament(t)
        // Set timer from remaining end_time
        let secs = t.duration_minutes ? t.duration_minutes * 60 : 7200
        if (t.end_time) {
          secs = Math.max(0, Math.floor((new Date(t.end_time).getTime() - Date.now()) / 1000))
        }
        setTournamentTime(secs)

        // Load participant data (balance & trade history) from backend
        api.getMyTournamentData(id).then(res => {
          if (res.participant) {
            setBalance(res.participant.balance)
          }
          if (res.trades) {
            // Map backend trades to frontend schema
            const mappedTrades = res.trades.map(tr => ({
              id: tr.id,
              direction: tr.direction,
              entryPrice: tr.entry_price,
              exitPrice: tr.exit_price,
              amount: tr.amount,
              expiry: tr.expiry_seconds,
              result: tr.result === 'pending' ? null : tr.result,
              profit: tr.profit_loss,
              time: tr.created_at ? new Date(tr.created_at).toLocaleTimeString() : new Date().toLocaleTimeString(),
              type: tr.result === 'pending' ? 'placed' : tr.result
            }))
            setTrades(mappedTrades)

            // Check if there is an active (pending) trade
            const active = res.trades.find(tr => tr.result === 'pending')
            if (active) {
              const createdAt = new Date(active.created_at).getTime()
              const elapsed = Math.floor((Date.now() - createdAt) / 1000)
              const remaining = Math.max(0, (active.expiry_seconds || 60) - elapsed)
              if (remaining > 0) {
                setActiveTrade({
                  id: active.id,
                  direction: active.direction,
                  entryPrice: active.entry_price,
                  amount: active.amount,
                  expiry: active.expiry_seconds || 60,
                  created_at: active.created_at
                })
                setCountdown(remaining)
              } else {
                // Exceeded duration, trigger immediate settle
                setActiveTrade({
                  id: active.id,
                  direction: active.direction,
                  entryPrice: active.entry_price,
                  amount: active.amount,
                  expiry: active.expiry_seconds || 60,
                  created_at: active.created_at
                })
                setCountdown(0)
              }
            }
          }
        }).catch(async (err) => {
          // Auto-join if user opened trading room without joining first
          if (err?.message?.includes('Not a participant')) {
            try {
              await tournamentStore.join(id)
              const res = await api.getMyTournamentData(id)
              if (res.participant) setBalance(res.participant.balance)
              return
            } catch (_) {}
          }
          const startBal = t.tournament_balance ?? t.starting_balance ?? 10000
          setBalance(startBal)
        })
      } else {
        setTournamentTime(7200)
      }
    }).catch(() => {
      setTournamentTime(7200)
    })
  }, [id])

  // Timer only starts AFTER tournament data loads (tournamentTime set from null)
  useEffect(() => {
    if (tournamentTime === null) return   // wait for data
    if (timerStarted.current) return      // only start once
    if (tournamentTime <= 0) return       // already ended

    timerStarted.current = true
    const timer = setInterval(() => {
      setTournamentTime(t => {
        if (t <= 1) { clearInterval(timer); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [tournamentTime])

  // Active trade countdown and settlement
  useEffect(() => {
    if (!activeTrade) return

    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(interval)
          // Settle the trade!
          const exitPrice = currentPriceRef.current
          const trade = activeTradeRef.current
          
          if (trade) {
            const settleBackend = async () => {
              try {
                // Settle on backend
                const res = await api.settleTrade(trade.id, exitPrice)
                const won = res.trade.result === 'win'
                const profit = res.trade.profit_loss

                setLastResult({ won, profit, direction: trade.direction })
                setBalance(res.balance)

                setTrades(prevTrades => {
                  const copy = [...prevTrades]
                  const idx = copy.findIndex(t => t.id === trade.id)
                  if (idx !== -1) {
                    copy[idx] = {
                      ...copy[idx],
                      exitPrice,
                      result: res.trade.result,
                      profit,
                      type: res.trade.result
                    }
                    return copy
                  }
                  return [
                    {
                      ...trade,
                      exitPrice,
                      result: res.trade.result,
                      profit,
                      type: res.trade.result,
                      time: new Date().toLocaleTimeString()
                    },
                    ...prevTrades
                  ]
                })

                if (won) {
                  notify('trade_win', `🎉 Trade Won! +$${profit.toFixed(2)} (${trade.direction.toUpperCase()})`)
                } else {
                  notify('trade_loss', `💔 Trade Lost! -$${trade.amount.toFixed(2)} (${trade.direction.toUpperCase()})`)
                }
              } catch (err) {
                notify('error', err.message || 'Failed to settle trade — balance unchanged')
              } finally {
                setActiveTrade(null)
                setTimeout(() => setLastResult(null), 3500)
              }
            }

            settleBackend()
          }
          return 0
        }
        return c - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [activeTrade, notify])

  const handlePriceUpdate = useCallback((price) => {
    setCurrentPrice(price)
  }, [])

  // Place a trade (Desktop & Mobile trigger)
  const placeTrade = useCallback(async (direction, amount, expiry) => {
    if (activeTradeRef.current) return
    if (amount > balance || amount <= 0) return

    // Pre-deduct client-side for responsive UI
    setBalance(b => b - amount)

    try {
      const res = await api.placeTrade({
        tournament_id: id,
        asset: tournament?.asset || 'BTC/USD',
        direction,
        amount,
        entry_price: currentPriceRef.current,
        expiry_seconds: expiry
      })

      if (res.trade) {
        setBalance(res.balance)
        const newTrade = {
          id: res.trade.id,
          direction: res.trade.direction,
          entryPrice: res.trade.entry_price,
          amount: res.trade.amount,
          expiry: res.trade.expiry_seconds,
          created_at: res.trade.created_at,
          type: 'placed',
          time: new Date().toLocaleTimeString()
        }
        setActiveTrade(newTrade)
        setCountdown(expiry)
        setTrades(t => [newTrade, ...t])
      }
    } catch (err) {
      // Revert balance deduction on failure
      setBalance(b => b + amount)
      notify('error', err.message || 'Failed to place trade')
    }
  }, [balance, id, tournament, notify])

  // Format tournament timer — show dashes while loading
  const time = tournamentTime ?? 0
  const hours = Math.floor(time / 3600)
  const mins = Math.floor((time % 3600) / 60)
  const secs = time % 60
  const isTimeRunningLow = time > 0 && time <= 300
  const isLoaded = tournamentTime !== null

  const livePoints = activeTrade
    ? (activeTrade.direction === 'up' ? currentPrice - activeTrade.entryPrice : activeTrade.entryPrice - currentPrice)
    : 0

  return (
    <div className="h-screen bg-dark-950 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="h-12 bg-dark-900/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span className="text-sm font-display font-bold text-white hidden sm:block">
              {tournament?.title || 'Trading Room'}
            </span>
          </div>
        </div>

        {/* Tournament Timer */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border ${isTimeRunningLow ? 'bg-red-500/20 border-red-500/40 animate-pulse' : 'bg-red-500/10 border-red-500/20'}`}>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className={`text-xs font-mono font-bold ${isTimeRunningLow ? 'text-red-300' : 'text-red-400'}`}>
              {isLoaded
                ? `${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`
                : '--:--:--'
              }
            </span>
          </div>
          {time === 0 && isLoaded && (
            <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20">
              ⏰ Ended
            </span>
          )}
          <div className="hidden sm:flex items-center gap-1 px-3 py-1 rounded-lg bg-white/5">
            <span className="text-xs text-white/30">Players:</span>
            <span className="text-xs font-bold text-white">{tournament?.current_players || '—'}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 px-3 py-1 rounded-lg bg-gold-500/10 border border-gold-500/20">
            <span className="text-xs text-gold-400/60">Prize:</span>
            <span className="text-xs font-bold text-gold-400">${(tournament?.prize_pool || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Balance */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-[10px] text-white/30">Balance</div>
            <div className="text-sm font-mono font-bold text-white">${balance.toFixed(2)}</div>
          </div>
        </div>
      </header>

      {/* Main Trading Area */}
      <div className="flex-1 flex min-h-0">
        {/* Chart - takes most space */}
        <div className="flex-1 min-w-0 flex flex-col relative">
          {/* Floating active trade overlay */}
          {activeTrade && (
            <div className="absolute top-16 right-4 z-10 glass-card p-3 border border-primary-500/30 bg-dark-950/80 backdrop-blur-md flex items-center gap-3 animate-slide-down shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              <span className={`w-2 h-2 rounded-full ${activeTrade.direction === 'up' ? 'bg-accent-500 shadow-neon-green' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'} animate-ping`} />
              <div className="text-xs">
                <span className="text-white/40">Active: </span>
                <span className={`font-bold uppercase ${activeTrade.direction === 'up' ? 'text-accent-400' : 'text-red-400'}`}>
                  {activeTrade.direction === 'up' ? '▲ BUY UP' : '▼ BUY DOWN'}
                </span>
                <span className="text-white/60 font-mono font-bold"> (${activeTrade.amount})</span>
              </div>
              <div className="w-[1px] h-4 bg-white/10" />
              <div className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${livePoints >= 0 ? 'text-accent-400 bg-accent-500/10' : 'text-red-400 bg-red-500/10'}`}>
                {livePoints >= 0 ? '+' : ''}{livePoints.toFixed(2)}
              </div>
              <div className="w-[1px] h-4 bg-white/10" />
              <div className="text-xs font-mono font-bold text-gold-400 animate-pulse">{countdown}s</div>
            </div>
          )}

          {/* Floating result flash overlay */}
          {lastResult && (
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 p-6 rounded-2xl text-center backdrop-blur-xl animate-scale-in border shadow-2xl ${
              lastResult.won ? 'bg-accent-500/10 border-accent-500/30 shadow-[0_0_30px_rgba(0,220,110,0.3)]' : 'bg-red-500/10 border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.3)]'
            }`}>
              <div className={`text-4xl font-display font-black tracking-wider mb-2 ${lastResult.won ? 'text-accent-400' : 'text-red-400'}`}>
                {lastResult.won ? '🎉 WIN!' : '💔 LOSS'}
              </div>
              <div className={`text-2xl font-mono font-bold ${lastResult.won ? 'text-accent-400' : 'text-red-400'}`}>
                {lastResult.profit > 0 ? `+$${lastResult.profit.toFixed(2)}` : `-$${Math.abs(lastResult.profit).toFixed(2)}`}
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0">
            <CandlestickChart asset={tournament?.asset || 'BTC/USD'} onPriceUpdate={handlePriceUpdate} />
          </div>

          {/* Trade History Strip (bottom of chart) */}
          <div className="h-28 border-t border-white/5 overflow-y-auto shrink-0">
            <div className="px-3 py-2">
              <div className="text-[10px] font-bold uppercase text-white/20 mb-1.5">Recent Trades</div>
              {trades.length === 0 ? (
                <div className="text-xs text-white/20 text-center py-3">No trades yet — place your first trade!</div>
              ) : (
                <div className="space-y-1">
                  {trades.slice(0, 5).map(t => (
                    <div key={t.id} className="flex items-center gap-2 text-xs">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.direction === 'up' ? 'bg-accent-500/20 text-accent-400' : 'bg-red-500/20 text-red-400'}`}>
                        {t.direction === 'up' ? '▲ UP' : '▼ DOWN'}
                      </span>
                      <span className="text-white/40">${t.amount}</span>
                      <span className="text-white/20">@ ${t.entryPrice?.toFixed(2)}</span>
                      {t.result ? (
                        <span className={`font-bold ${t.result === 'win' ? 'text-accent-400' : 'text-red-400'}`}>
                          {t.result === 'win' ? `+$${t.profit.toFixed(2)}` : `-$${t.amount.toFixed(2)}`}
                        </span>
                      ) : (
                        <span className={`font-mono font-bold px-1.5 py-0.5 rounded animate-pulse ${
                          (t.direction === 'up' ? currentPrice - t.entryPrice : t.entryPrice - currentPrice) >= 0 ? 'text-accent-400 bg-accent-500/10' : 'text-red-400 bg-red-500/10'
                        }`}>
                          {(t.direction === 'up' ? currentPrice - t.entryPrice : t.entryPrice - currentPrice) >= 0 ? '+' : ''}
                          {(t.direction === 'up' ? currentPrice - t.entryPrice : t.entryPrice - currentPrice).toFixed(2)}
                        </span>
                      )}
                      <span className="text-white/20 ml-auto">{t.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Trade Panel / Leaderboard */}
        <div className="w-72 lg:w-80 border-l border-white/5 flex flex-col bg-dark-900/50 shrink-0 hidden md:flex">
          {/* Panel Tabs */}
          <div className="flex border-b border-white/5 shrink-0">
            {[
              { key: 'trade', label: '💹 Trade' },
              { key: 'leaderboard', label: '🏆 Rank' },
              { key: 'chat', label: '💬 Chat' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActivePanel(tab.key)}
                className={`flex-1 py-2.5 text-xs font-bold transition-all ${activePanel === tab.key ? 'text-primary-400 border-b-2 border-primary-400 bg-primary-500/5' : 'text-white/30 hover:text-white/60'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Panel Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {activePanel === 'trade' && (
              <TradePanel
                currentPrice={currentPrice}
                balance={balance}
                activeTrade={activeTrade}
                countdown={countdown}
                lastResult={lastResult}
                onPlaceTrade={placeTrade}
              />
            )}
            {activePanel === 'leaderboard' && (
              <Leaderboard userBalance={balance} tournamentId={id} />
            )}
            {activePanel === 'chat' && (
              <TournamentChat tournamentId={id} />
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="md:hidden h-14 bg-dark-900/95 border-t border-white/5 flex items-center justify-around px-2 shrink-0">
        <button onClick={() => setActivePanel('trade')} className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg ${activePanel === 'trade' ? 'text-primary-400' : 'text-white/30'}`}>
          <span className="text-lg">💹</span>
          <span className="text-[10px] font-bold">Trade</span>
        </button>
        <button onClick={() => setActivePanel('leaderboard')} className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg ${activePanel === 'leaderboard' ? 'text-primary-400' : 'text-white/30'}`}>
          <span className="text-lg">🏆</span>
          <span className="text-[10px] font-bold">Rank</span>
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => placeTrade('up', 100, 60)}
            disabled={!!activeTrade || 100 > balance}
            className="px-5 py-2 rounded-lg bg-accent-500 text-white text-xs font-bold active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          >▲ UP</button>
          <button
            onClick={() => placeTrade('down', 100, 60)}
            disabled={!!activeTrade || 100 > balance}
            className="px-5 py-2 rounded-lg bg-red-500 text-white text-xs font-bold active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          >▼ DOWN</button>
        </div>
      </div>
    </div>
  )
}
