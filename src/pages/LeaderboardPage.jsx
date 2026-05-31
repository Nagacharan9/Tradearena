import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCurrency } from '../contexts/CurrencyContext'

const PODIUM_STYLES = {
  1: { bg: 'from-gold-400/20 to-gold-600/5', border: 'border-gold-400/40', glow: 'shadow-[0_0_30px_rgba(255,189,32,0.2)]', badge: 'bg-gold-400 text-dark-950', size: 'w-20 h-20', text: 'text-gold-400' },
  2: { bg: 'from-slate-300/15 to-slate-500/5', border: 'border-slate-300/30', glow: '', badge: 'bg-slate-300 text-dark-950', size: 'w-16 h-16', text: 'text-slate-300' },
  3: { bg: 'from-orange-500/15 to-orange-700/5', border: 'border-orange-500/30', glow: '', badge: 'bg-orange-500 text-white', size: 'w-16 h-16', text: 'text-orange-400' },
}

// Mock leaderboard — used when backend is offline
const MOCK_PLAYERS = [
  { id: 'm1', username: 'AlphaWolf', country: '🇺🇸', balance: 128400, win_count: 89, loss_count: 21, total_tournaments: 47 },
  { id: 'm2', username: 'CryptoQueen', country: '🇬🇧', balance: 98200, win_count: 76, loss_count: 31, total_tournaments: 38 },
  { id: 'm3', username: 'SilentSniper', country: '🇯🇵', balance: 87600, win_count: 64, loss_count: 22, total_tournaments: 31 },
  { id: 'm4', username: 'ForexMaster', country: '🇩🇪', balance: 74100, win_count: 58, loss_count: 28, total_tournaments: 29 },
  { id: 'm5', username: 'BullRunner', country: '🇮🇳', balance: 65300, win_count: 50, loss_count: 33, total_tournaments: 24 },
  { id: 'm6', username: 'NeonTrader', country: '🇧🇷', balance: 54000, win_count: 43, loss_count: 29, total_tournaments: 21 },
  { id: 'm7', username: 'GoldFinch42', country: '🇫🇷', balance: 47500, win_count: 37, loss_count: 25, total_tournaments: 18 },
  { id: 'm8', username: 'ChartNinja', country: '🇰🇷', balance: 39800, win_count: 29, loss_count: 20, total_tournaments: 15 },
  { id: 'm9', username: 'WaveRider', country: '🇦🇺', balance: 31200, win_count: 22, loss_count: 18, total_tournaments: 12 },
  { id: 'm10', username: 'FlashPoint', country: '🇨🇦', balance: 25600, win_count: 17, loss_count: 14, total_tournaments: 9 },
]

export default function LeaderboardPage() {
  const { user } = useAuth()
  const { format } = useCurrency()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(data => {
        const apiPlayers = data.users || []
        if (apiPlayers.length > 0) {
          const sorted = apiPlayers
            .map((u, i) => ({
              ...u,
              rank: i + 1,
              profit: u.balance || 0,
              winRate: u.win_count > 0 ? Math.round((u.win_count / (u.win_count + (u.loss_count || 0))) * 100) : 0,
            }))
            .sort((a, b) => b.profit - a.profit)
            .map((u, i) => ({ ...u, rank: i + 1 }))
          setPlayers(sorted)
        } else {
          // Use mock data when API has no users
          const mock = MOCK_PLAYERS.map((u, i) => ({
            ...u,
            rank: i + 1,
            profit: u.balance,
            winRate: Math.round((u.win_count / (u.win_count + u.loss_count)) * 100),
          }))
          setPlayers(mock)
        }
      })
      .catch(() => {
        // API offline — use mock data
        const mock = MOCK_PLAYERS.map((u, i) => ({
          ...u,
          rank: i + 1,
          profit: u.balance,
          winRate: Math.round((u.win_count / (u.win_count + u.loss_count)) * 100),
        }))
        setPlayers(mock)
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = players.filter(p =>
    p.username?.toLowerCase().includes(search.toLowerCase())
  )
  const top3 = filtered.slice(0, 3)
  const rest = filtered.slice(3)

  // Find logged-in user's position in full (unfiltered) list
  const myEntry = user
    ? players.find(p => p.id === user.id || p.username === user.username)
    : null

  const rankLabel = (rank) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <header className="bg-dark-900/80 backdrop-blur-xl border-b border-white/5 px-4 lg:px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link to="/dashboard" className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
          <h1 className="text-xl font-display font-bold text-white">🏅 Global Leaderboard</h1>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8 space-y-6">

        {/* ── Your Position Card ── */}
        {!loading && myEntry && (
          <div className="glass-card p-4 border border-primary-500/30 bg-primary-500/5">
            <div className="flex items-center gap-4">
              <div className="shrink-0 text-center">
                <div className="text-2xl font-black text-primary-400">{rankLabel(myEntry.rank)}</div>
                <div className="text-[10px] text-white/30 mt-0.5">Your Rank</div>
              </div>
              <div className="w-[1px] h-10 bg-white/10 shrink-0" />
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-lg font-bold text-white shrink-0">
                {myEntry.username?.[0] || 'Y'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{myEntry.username}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-primary-500/20 text-primary-400 font-bold">YOU</span>
                  <span className="text-sm">{myEntry.country}</span>
                </div>
                <div className="text-xs text-white/30 mt-0.5">
                  {myEntry.win_count || 0}W · {myEntry.loss_count || 0}L · {myEntry.total_tournaments || 0} tournaments
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-mono font-bold text-accent-400">{format(myEntry.profit || 0)}</div>
                <div className="text-xs text-white/30 mt-0.5">{myEntry.winRate}% win rate</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Not logged in nudge ── */}
        {!loading && !myEntry && !user && (
          <div className="glass-card p-4 border border-white/10 text-center">
            <p className="text-sm text-white/30">
              <Link to="/login" className="text-primary-400 hover:text-primary-300 font-bold">Sign in</Link> to see your position on the leaderboard
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-1 p-1 rounded-xl bg-white/5">
            {['all', 'weekly', 'monthly'].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${filter === f ? 'bg-primary-500/20 text-primary-400' : 'text-white/30 hover:text-white'}`}>
                {f === 'all' ? 'All Time' : f}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <input value={search} onChange={e => setSearch(e.target.value)} className="glass-input pl-9 text-sm" placeholder="Search player..." />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/></svg>
          </div>
        </div>

        {loading && (
          <div className="text-center py-16">
            <div className="w-10 h-10 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-white/30">Loading leaderboard...</p>
          </div>
        )}

        {/* Podium — only if 3+ players */}
        {!loading && top3.length >= 3 && (
          <div className="flex items-end justify-center gap-6 py-8">
            {[1, 0, 2].map(idx => {
              const p = top3[idx]
              if (!p) return null
              const s = PODIUM_STYLES[p.rank]
              const isMe = myEntry && (p.id === myEntry.id || p.username === myEntry.username)
              return (
                <div key={p.rank} className={`flex flex-col items-center ${p.rank === 1 ? '-mt-6' : ''}`}>
                  <div className={`${s.size} rounded-2xl bg-gradient-to-br ${s.bg} border ${s.border} ${s.glow} ${isMe ? 'ring-2 ring-primary-400/50' : ''} flex items-center justify-center text-2xl font-bold text-white mb-2`}>
                    {(p.username || 'U')[0]}
                  </div>
                  <div className={`${s.badge} w-8 h-8 rounded-full flex items-center justify-center text-sm font-black -mt-4 mb-2 z-10`}>{p.rank}</div>
                  <div className="text-sm font-bold text-white text-center flex items-center gap-1">
                    {p.username}
                    {isMe && <span className="text-[9px] px-1 py-0.5 rounded bg-primary-500/20 text-primary-400 font-black">YOU</span>}
                  </div>
                  <div className="text-xs text-white/40 text-center">{p.country}</div>
                  <div className={`text-sm font-mono font-bold ${s.text} mt-1`}>{format(p.profit || 0)}</div>
                  <div className="text-[10px] text-white/30 mt-0.5">{p.winRate}% win rate</div>
                </div>
              )
            })}
          </div>
        )}

        {/* Table */}
        {!loading && rest.length > 0 && (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Rank', 'Player', 'Balance', 'Win Rate', 'Tournaments'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-white/20 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rest.map(p => {
                    const isMe = myEntry && (p.id === myEntry.id || p.username === myEntry.username)
                    return (
                      <tr key={p.rank} className={`border-b border-white/[0.03] transition-colors ${isMe ? 'bg-primary-500/5 border-l-2 border-l-primary-500' : 'hover:bg-white/[0.02]'}`}>
                        <td className="px-4 py-3">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${isMe ? 'bg-primary-500/20 text-primary-400' : 'bg-white/5 text-white/40'}`}>
                            {p.rank}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isMe ? 'bg-gradient-to-br from-primary-500 to-accent-500 text-white ring-1 ring-primary-400/50' : 'bg-white/10 text-white/50'}`}>
                              {(p.username || 'U')[0]}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-sm font-semibold ${isMe ? 'text-primary-400' : 'text-white'}`}>{p.username}</span>
                                {isMe && <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary-500/20 text-primary-400 font-black">YOU</span>}
                              </div>
                              <div className="text-[10px] text-white/30">{p.country}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono font-bold text-accent-400">{format(p.profit || 0)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${isMe ? 'bg-primary-500' : 'bg-accent-500'}`} style={{ width: `${p.winRate}%` }} />
                            </div>
                            <span className={`text-xs ${isMe ? 'text-primary-400' : 'text-white/40'}`}>{p.winRate}%</span>
                          </div>
                        </td>
                        <td className={`px-4 py-3 text-sm ${isMe ? 'text-primary-300' : 'text-white/40'}`}>{p.total_tournaments || 0}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
