import { useState } from 'react'

export default function TradePanel({ currentPrice, balance, activeTrade, countdown, lastResult, onPlaceTrade }) {
  const [amount, setAmount] = useState(100)
  const [expiry, setExpiry] = useState(60)

  const AMOUNTS = [10, 25, 50, 100, 250, 500, 1000]
  const EXPIRY_OPTIONS = [30, 60, 120, 300]
  const payout = amount * 0.85

  const handleTrade = (direction) => {
    if (activeTrade || amount > balance || amount <= 0) return
    onPlaceTrade?.(direction, amount, expiry)
  }

  const progressPct = activeTrade ? (countdown / activeTrade.expiry) * 100 : 0

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Balance */}
      <div className="px-4 py-3 border-b border-white/5 shrink-0">
        <div className="text-xs text-white/30 mb-1">Tournament Balance</div>
        <div className="text-2xl font-display font-bold text-white">${balance.toFixed(2)}</div>
      </div>

      {/* Active Trade */}
      {activeTrade && (() => {
        const livePoints = activeTrade.direction === 'up' ? currentPrice - activeTrade.entryPrice : activeTrade.entryPrice - currentPrice
        return (
          <div className={`mx-4 mt-3 p-3 rounded-xl border shrink-0 ${activeTrade.direction === 'up' ? 'border-accent-500/30 bg-accent-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className={`text-xs font-bold uppercase ${activeTrade.direction === 'up' ? 'text-accent-400' : 'text-red-400'}`}>
                {activeTrade.direction === 'up' ? '📈 BUY UP' : '📉 BUY DOWN'}
              </span>
              <span className="text-xs text-white/40">${activeTrade.amount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-white/30">Entry: ${activeTrade.entryPrice?.toFixed(2)}</span>
              <div className="text-xl font-mono font-bold text-gold-400">{countdown}s</div>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-white/30">Current: ${currentPrice.toFixed(2)}</span>
              <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${livePoints >= 0 ? 'text-accent-400 bg-accent-500/10' : 'text-red-400 bg-red-500/10'}`}>
                {livePoints >= 0 ? '+' : ''}{livePoints.toFixed(2)}
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gold-400 rounded-full transition-all duration-1000"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )
      })()}

      {/* Result Flash */}
      {lastResult && (
        <div className={`mx-4 mt-3 p-4 rounded-xl text-center animate-scale-in shrink-0 ${lastResult.won ? 'bg-accent-500/10 border border-accent-500/30 shadow-[0_0_15px_rgba(0,220,110,0.15)]' : 'bg-red-500/10 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]'}`}>
          <div className={`text-2xl font-display font-bold ${lastResult.won ? 'text-accent-400' : 'text-red-400'}`}>
            {lastResult.won ? '🎉 WIN!' : '💔 LOSS'}
          </div>
          <div className={`text-lg font-mono font-bold ${lastResult.won ? 'text-accent-400' : 'text-red-400'}`}>
            {lastResult.profit > 0 ? '+' : ''}{lastResult.profit.toFixed(2)}
          </div>
        </div>
      )}

      <div className="flex-1 px-4 py-3 space-y-4 overflow-y-auto">
        {/* Amount */}
        <div>
          <label className="text-xs text-white/30 mb-2 block">Trade Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
              className="glass-input pl-7 text-lg font-mono font-bold"
              disabled={!!activeTrade}
            />
          </div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {AMOUNTS.map(a => (
              <button
                key={a}
                onClick={() => setAmount(a)}
                disabled={!!activeTrade}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40 ${amount === a ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'bg-white/5 text-white/40 hover:text-white'}`}
              >
                ${a}
              </button>
            ))}
          </div>
        </div>

        {/* Expiry */}
        <div>
          <label className="text-xs text-white/30 mb-2 block">Expiry Time</label>
          <div className="grid grid-cols-4 gap-1.5">
            {EXPIRY_OPTIONS.map(e => (
              <button
                key={e}
                onClick={() => setExpiry(e)}
                disabled={!!activeTrade}
                className={`py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-40 ${expiry === e ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'bg-white/5 text-white/40 hover:text-white'}`}
              >
                {e >= 60 ? `${e / 60}m` : `${e}s`}
              </button>
            ))}
          </div>
        </div>

        {/* Payout Preview */}
        <div className="glass-card p-3">
          <div className="flex justify-between text-xs text-white/30 mb-1">
            <span>Potential Profit</span>
            <span>85% payout</span>
          </div>
          <div className="text-xl font-display font-bold text-accent-400">+${payout.toFixed(2)}</div>
          {amount > balance && (
            <div className="text-xs text-red-400 mt-1">⚠️ Insufficient balance</div>
          )}
        </div>
      </div>

      {/* Trade Buttons */}
      <div className="p-4 grid grid-cols-2 gap-3 shrink-0">
        <button
          onClick={() => handleTrade('up')}
          disabled={!!activeTrade || amount > balance || amount <= 0}
          className="py-4 rounded-xl font-bold text-white bg-gradient-to-b from-accent-500 to-accent-600 hover:shadow-neon-green transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
        >
          <div className="text-lg">📈</div>
          <div className="text-sm">BUY UP</div>
        </button>
        <button
          onClick={() => handleTrade('down')}
          disabled={!!activeTrade || amount > balance || amount <= 0}
          className="py-4 rounded-xl font-bold text-white bg-gradient-to-b from-red-500 to-red-600 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
        >
          <div className="text-lg">📉</div>
          <div className="text-sm">BUY DOWN</div>
        </button>
      </div>
    </div>
  )
}
