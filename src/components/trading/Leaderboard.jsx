import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'

const MOCK_LEADERBOARD = [
  { rank: 1, username: 'AlphaWolf', country: '🇺🇸', balance: 12840, profit: 28.4, wins: 18, trades: 24, isBot: false },
  { rank: 2, username: 'CryptoKing', country: '🇬🇧', balance: 11920, profit: 19.2, wins: 15, trades: 22, isBot: true },
  { rank: 3, username: 'SilentSniper', country: '🇯🇵', balance: 11650, profit: 16.5, wins: 14, trades: 20, isBot: true },
  { rank: 4, username: 'ForexQueen', country: '🇩🇪', balance: 11200, profit: 12.0, wins: 12, trades: 19, isBot: false },
  { rank: 5, username: 'BullRunner', country: '🇮🇳', balance: 10890, profit: 8.9, wins: 11, trades: 18, isBot: true },
  { rank: 6, username: 'NeonTrader', country: '🇧🇷', balance: 10540, profit: 5.4, wins: 10, trades: 17, isBot: true },
  { rank: 7, username: 'GoldFinch42', country: '🇫🇷', balance: 10320, profit: 3.2, wins: 9, trades: 16, isBot: true },
  { rank: 8, username: 'You', country: '🌍', balance: 10000, profit: 0, wins: 0, trades: 0, isBot: false, isUser: true },
  { rank: 9, username: 'ChartNinja', country: '🇰🇷', balance: 9800, profit: -2.0, wins: 7, trades: 15, isBot: true },
  { rank: 10, username: 'WaveRider', country: '🇦🇺', balance: 9500, profit: -5.0, wins: 6, trades: 14, isBot: true },
]

const RANK_STYLES = {
  1: { bg: 'bg-gradient-to-r from-gold-400/10 to-transparent', border: 'border-gold-400/30', badge: 'bg-gold-400 text-dark-950', glow: 'shadow-[0_0_20px_rgba(255,189,32,0.15)]' },
  2: { bg: 'bg-gradient-to-r from-slate-400/10 to-transparent', border: 'border-slate-400/30', badge: 'bg-slate-300 text-dark-950', glow: '' },
  3: { bg: 'bg-gradient-to-r from-orange-500/10 to-transparent', border: 'border-orange-500/30', badge: 'bg-orange-500 text-white', glow: '' },
}

export default function Leaderboard({ userBalance = 10000, tournamentId }) {
  const [board, setBoard] = useState([])
  const { user } = useAuth()

  useEffect(() => {
    if (!tournamentId) {
      setBoard(MOCK_LEADERBOARD.map((p, i) => ({ ...p, rank: i + 1 })))
      return
    }

    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`/api/tournaments/${tournamentId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('tradearena_token')}`
          }
        })
        if (res.ok) {
          const data = await res.json()
          const apiLeaderboard = data.leaderboard || []
          
          const mapped = apiLeaderboard.map((p, index) => {
            const startingBalance = data.tournament?.tournament_balance ?? 10000
            const profitPct = startingBalance > 0 
              ? ((p.balance - startingBalance) / startingBalance) * 100 
              : 0
            
            const isCurrentUser = user && p.user_id === user.id
            
            return {
              rank: index + 1,
              username: p.username || 'Unknown',
              country: p.country || '🌍',
              balance: isCurrentUser ? userBalance : (p.balance || 0),
              profit: profitPct,
              wins: p.win_count || 0,
              trades: p.trade_count || 0,
              isBot: !!p.is_bot,
              isUser: isCurrentUser,
            }
          })
          
          const sorted = mapped
            .sort((a, b) => b.balance - a.balance)
            .map((p, i) => ({ ...p, rank: i + 1 }))
            
          setBoard(sorted)
        }
      } catch (err) {
        console.error('Failed to fetch tournament leaderboard:', err)
      }
    }

    fetchLeaderboard()
    const interval = setInterval(fetchLeaderboard, 3000)
    return () => clearInterval(interval)
  }, [tournamentId, user, userBalance])

  // Mock simulation fallback if no tournamentId
  useEffect(() => {
    if (tournamentId) return
    const interval = setInterval(() => {
      setBoard(prev => {
        const updated = prev.map(p => {
          if (p.isUser) return { ...p, balance: userBalance }
          if (Math.random() > 0.7) {
            const change = (Math.random() - 0.4) * 200
            return { ...p, balance: Math.max(0, p.balance + change), profit: p.profit + (change / 100) }
          }
          return p
        })
        return updated.sort((a, b) => b.balance - a.balance).map((p, i) => ({ ...p, rank: i + 1 }))
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [tournamentId, userBalance])

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/5">
        <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
          🏆 Live Leaderboard
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute h-2 w-2 rounded-full bg-accent-400 opacity-75"></span>
            <span className="relative rounded-full h-2 w-2 bg-accent-500"></span>
          </span>
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {board.map(player => {
          const style = RANK_STYLES[player.rank] || {}
          return (
            <div
              key={player.username}
              className={`flex items-center gap-2 px-3 py-2 border-b border-white/[0.03] transition-all duration-500 ${style.bg || ''} ${player.isUser ? 'bg-primary-500/5 border-l-2 border-l-primary-500' : ''} ${style.glow}`}
            >
              {/* Rank */}
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${style.badge || 'bg-white/5 text-white/40'}`}>
                {player.rank}
              </div>
              {/* Avatar */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${player.isUser ? 'bg-primary-500/30 text-primary-300 ring-1 ring-primary-400/50' : 'bg-white/10 text-white/50'}`}>
                {player.username[0]}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className={`text-xs font-semibold truncate ${player.isUser ? 'text-primary-400' : 'text-white'}`}>{player.username}</span>
                  <span className="text-xs">{player.country}</span>
                </div>
                <div className="text-[10px] text-white/20">{player.wins}W / {player.trades}T</div>
              </div>
              {/* Balance */}
              <div className="text-right shrink-0">
                <div className="text-xs font-mono font-bold text-white">${player.balance.toFixed(0)}</div>
                <div className={`text-[10px] font-mono ${player.profit >= 0 ? 'text-accent-400' : 'text-red-400'}`}>
                  {player.profit >= 0 ? '+' : ''}{player.profit.toFixed(1)}%
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
