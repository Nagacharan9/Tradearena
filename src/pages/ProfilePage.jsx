import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { formatMoney, CURRENCIES } from '../utils/currency'

const BADGES = [
  { icon: '🏆', name: 'Champion', desc: 'Won a tournament', key: 'champion' },
  { icon: '🔥', name: 'Win Streak x5', desc: '5 consecutive wins', key: 'streak5' },
  { icon: '🎯', name: 'Sharpshooter', desc: '70%+ win rate', key: 'sharpshooter' },
  { icon: '💎', name: 'Diamond Hands', desc: 'Top 3 in Diamond tier', key: 'diamond' },
  { icon: '👑', name: 'Weekly Legend', desc: 'Win weekly championship', key: 'legend' },
  { icon: '🤝', name: 'Referral King', desc: '10+ successful referrals', key: 'referral' },
  { icon: '⚡', name: 'Speed Demon', desc: 'Win a 15min tournament', key: 'speed' },
  { icon: '🛡️', name: 'Bot Slayer', desc: 'Beat elite bots', key: 'botslayer' },
]

export default function ProfilePage() {
  const { user } = useAuth()
  const { currency, currencyInfo, currencyRegions, setCurrency, format } = useCurrency()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [txFilter, setTxFilter] = useState('all')

  const u = user || {
    username: 'Trader',
    rank_level: 1,
    win_count: 0,
    loss_count: 0,
    total_tournaments: 0,
    country: '🌍',
    email: '',
    balance: 0,
    tournament_balance: 0,
    bonus_balance: 0,
  }
  const winRate = (u.win_count + u.loss_count) > 0
    ? Math.round((u.win_count / (u.win_count + u.loss_count)) * 100)
    : 0

  const transactions = user?.transactions || []

  const filteredTx = transactions.filter(t => {
    if (txFilter === 'all') return true
    if (txFilter === 'deposits') return t.type === 'deposit'
    if (txFilter === 'withdrawals') return t.type === 'withdrawal' || t.type === 'withdraw'
    return true
  })

  const statusStyle = (status) => {
    switch (status) {
      case 'completed': case 'approved':
        return 'text-accent-400 bg-accent-500/10 border-accent-500/20'
      case 'pending':
        return 'text-gold-400 bg-gold-500/10 border-gold-500/20'
      case 'rejected': case 'failed':
        return 'text-red-400 bg-red-500/10 border-red-500/20'
      default:
        return 'text-white/40 bg-white/5 border-white/10'
    }
  }

  const txIcon = (type, amount) => {
    if (type === 'deposit' || amount > 0) return { icon: '↓', bg: 'bg-accent-500/10', text: 'text-accent-400' }
    if (type === 'withdrawal' || type === 'withdraw') return { icon: '↑', bg: 'bg-red-500/10', text: 'text-red-400' }
    if (type === 'transfer') return { icon: '⇄', bg: 'bg-primary-500/10', text: 'text-primary-400' }
    return { icon: '•', bg: 'bg-white/5', text: 'text-white/40' }
  }

  const handleCurrencyChange = async (code) => {
    if (code === currency) return
    setSaving(true)
    setSaved(false)
    await setCurrency(code)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <header className="bg-dark-900/80 backdrop-blur-xl border-b border-white/5 px-4 lg:px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link to="/dashboard" className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
          <h1 className="text-xl font-display font-bold text-white">👤 Profile</h1>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8 space-y-6">
        {/* Profile Card */}
        <div className="glass-card p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-4xl font-bold text-white shadow-neon-blue">
              {u.username[0]}
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-gold-500 flex items-center justify-center text-sm font-bold text-dark-950 shadow-neon-gold">
              {u.rank_level || 1}
            </div>
          </div>
          <div className="text-center sm:text-left flex-1">
            <h2 className="text-2xl font-display font-bold text-white flex items-center justify-center sm:justify-start gap-2">
              {u.username} <span className="text-2xl">{u.country}</span>
            </h2>
            <p className="text-sm text-white/30 mb-1">{u.email || '—'}</p>
            <p className="text-sm text-white/30 mb-3">Level {u.rank_level || 1} Trader</p>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-primary-500/15 text-primary-400">🎯 {winRate}% Win Rate</span>
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-accent-500/15 text-accent-400">🏆 {u.total_tournaments || 0} Played</span>
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-gold-500/15 text-gold-400">
                {currencyInfo.flag} {currencyInfo.code}
              </span>
            </div>
          </div>
        </div>

        {/* Display currency — main feature for Indian / international users */}
        <div className="glass-card p-6 border border-primary-500/20">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                💱 Display currency
              </h3>
              <p className="text-sm text-white/40 mt-1 max-w-xl">
                Choose how balances and amounts are shown across Wallet, Dashboard, and tournaments.
                Values are converted from platform USD for your convenience (approximate rates).
              </p>
            </div>
            {saved && (
              <span className="text-xs font-bold text-accent-400 bg-accent-500/10 px-3 py-1.5 rounded-lg border border-accent-500/20 shrink-0">
                ✓ Saved
              </span>
            )}
            {saving && (
              <span className="text-xs text-white/40 shrink-0">Saving…</span>
            )}
          </div>

          {/* Current selection preview */}
          <div className="mb-5 p-4 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="text-xs text-white/30 mb-2">Your balances in {currencyInfo.name}</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="text-[10px] text-white/25 uppercase">Real balance</div>
                <div className="text-lg font-mono font-bold text-accent-400">{format(u.balance || 0)}</div>
              </div>
              <div>
                <div className="text-[10px] text-white/25 uppercase">Tournament</div>
                <div className="text-lg font-mono font-bold text-primary-400">{format(u.tournament_balance || 0)}</div>
              </div>
              <div>
                <div className="text-[10px] text-white/25 uppercase">Bonus</div>
                <div className="text-lg font-mono font-bold text-gold-400">{format(u.bonus_balance || 0)}</div>
              </div>
            </div>
            <p className="text-[10px] text-white/20 mt-3">
              Example: $100 prize pool ≈ {formatMoney(100, currency)} · Entry $10 ≈ {formatMoney(10, currency)}
            </p>
          </div>

          <div className="max-w-md">
            <label className="text-xs text-white/40 mb-2 block font-medium">
              Select your country / currency
            </label>
            <div className="relative">
              <select
                value={currency}
                disabled={saving}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="glass-input w-full py-3 pr-10 text-sm font-medium appearance-none cursor-pointer disabled:opacity-50"
              >
                {currencyRegions.map((region) => (
                  <optgroup key={region.label} label={region.label}>
                    {region.codes.map((code) => {
                      const c = CURRENCIES[code]
                      if (!c) return null
                      return (
                        <option key={code} value={code}>
                          {c.flag} {c.name} ({c.code})
                        </option>
                      )
                    })}
                  </optgroup>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
                ▼
              </span>
            </div>
            <p className="text-[10px] text-white/25 mt-2">
              Currently showing: <span className="text-primary-400 font-bold">{currencyInfo.flag} {currencyInfo.name}</span>
            </p>
          </div>

          {currency === 'INR' && (
            <div className="mt-4 p-3 rounded-lg bg-accent-500/10 border border-accent-500/20 text-xs text-accent-200/90">
              🇮🇳 <strong>India:</strong> Amounts now show in Rupees (₹). UPI and bank deposits in Wallet still work the same — only the display changes to help you read balances easily.
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Wins', value: u.win_count || 0, color: 'text-accent-400' },
            { label: 'Losses', value: u.loss_count || 0, color: 'text-red-400' },
            { label: 'Tournaments', value: u.total_tournaments || 0, color: 'text-primary-400' },
            { label: 'Win Rate', value: `${winRate}%`, color: 'text-gold-400' },
          ].map(s => (
            <div key={s.label} className="glass-card p-4 text-center">
              <div className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-white/30">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Deposit & Withdrawal History */}
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
              💸 Deposit & Withdrawal History
            </h3>
            <div className="flex gap-1 p-1 rounded-xl bg-white/5 w-fit">
              {[
                { key: 'all', label: 'All' },
                { key: 'deposits', label: 'Deposits' },
                { key: 'withdrawals', label: 'Withdrawals' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setTxFilter(f.key)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${txFilter === f.key ? 'bg-primary-500/20 text-primary-400' : 'text-white/30 hover:text-white'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredTx.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-sm text-white/30 font-medium">
                {txFilter === 'all'
                  ? 'No transactions yet'
                  : txFilter === 'deposits'
                  ? 'No deposits yet'
                  : 'No withdrawals yet'}
              </p>
              <p className="text-xs text-white/15 mt-1">
                {txFilter === 'all'
                  ? 'Your deposit and withdrawal history will appear here'
                  : txFilter === 'deposits'
                  ? 'Make your first deposit from the Wallet page'
                  : 'Request a withdrawal from the Wallet page'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.03]">
              {filteredTx.map((t, idx) => {
                const ic = txIcon(t.type, t.amount)
                return (
                  <div key={t.id || idx} className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${ic.bg} ${ic.text}`}>
                      {ic.icon}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white capitalize truncate">
                        {t.type?.replace(/_/g, ' ') || 'Transaction'}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-white/25">{t.date}</span>
                        {t.method && (
                          <>
                            <span className="text-[10px] text-white/10">•</span>
                            <span className="text-[10px] text-white/25 capitalize">{t.method}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border capitalize shrink-0 ${statusStyle(t.status)}`}>
                      {t.status || 'unknown'}
                    </span>

                    {/* Amount */}
                    <div className={`text-sm font-mono font-bold shrink-0 ${t.amount > 0 || t.type === 'deposit' ? 'text-accent-400' : 'text-red-400'}`}>
                      {t.amount > 0 || t.type === 'deposit' ? '+' : ''}{format(Math.abs(t.amount))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Summary footer */}
          {transactions.length > 0 && (
            <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] text-white/20">
                Showing {filteredTx.length} of {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
              </span>
              <Link to="/wallet" className="text-[10px] font-bold text-primary-400 hover:text-primary-300 transition-colors">
                Go to Wallet →
              </Link>
            </div>
          )}
        </div>

        {/* Achievements */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-display font-bold text-white mb-4">🎖️ Achievements</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {BADGES.map(b => (
              <div key={b.name} className="p-3 rounded-xl border border-white/5 bg-white/[0.02] opacity-40 text-center">
                <div className="text-2xl mb-1">{b.icon}</div>
                <div className="text-xs font-bold text-white">{b.name}</div>
                <div className="text-[10px] text-white/30">{b.desc}</div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-white/20 mt-3 text-center">Complete challenges to unlock achievements</p>
        </div>
      </div>
    </div>
  )
}
