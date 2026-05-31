import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import tournamentStore from '../services/tournamentStore'
import { useNotification } from '../contexts/NotificationContext'
import { useCurrency } from '../contexts/CurrencyContext'
import api from '../services/api'

const TIER_COLORS = {
  bronze: 'from-orange-500 to-orange-700',
  silver: 'from-slate-300 to-slate-500',
  gold: 'from-gold-400 to-gold-600',
  diamond: 'from-primary-400 to-primary-600',
  legendary: 'from-purple-400 to-pink-500',
}
const TIER_BORDERS = {
  bronze: 'border-orange-500/20', silver: 'border-slate-400/20',
  gold: 'border-gold-500/30', diamond: 'border-primary-500/30', legendary: 'border-purple-500/30',
}

export default function TournamentsPage() {
  const navigate = useNavigate()
  const { notify } = useNotification()
  const { format } = useCurrency()
  const [filter, setFilter] = useState('all')
  const [joiningId, setJoiningId] = useState(null)
  const [tierFilter, setTierFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [tournaments, setTournaments] = useState([])
  const [joinedIds, setJoinedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    tournamentStore.getAll()
      .then(data => setTournaments(data))
      .catch(() => setTournaments([]))
      .finally(() => setLoading(false))
    api.getJoinedTournaments()
      .then(data => setJoinedIds(new Set((data.tournaments || []).map(t => String(t.id)))))
      .catch(() => {})
  }, [])

  const filtered = tournaments.filter(t => {
    if (filter === 'joined') return joinedIds.has(String(t.id))
    if (filter === 'active') return t.status === 'active'
    if (filter === 'upcoming') return t.status === 'upcoming'
    if (filter === 'finished') return t.status === 'completed'
    if (filter !== 'all' && t.status !== filter) return false
    if (tierFilter !== 'all' && t.tier !== tierFilter) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="min-h-screen bg-dark-950">
      <header className="bg-dark-900/80 backdrop-blur-xl border-b border-white/5 px-4 lg:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link to="/dashboard" className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
          <h1 className="text-xl font-display font-bold text-white">🏆 Browse Tournaments</h1>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8 space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1 p-1 rounded-xl bg-white/5">
              {[
                { id: 'joined', label: `✅ Joined${joinedIds.size > 0 ? ` (${joinedIds.size})` : ''}` },
                { id: 'active', label: '🔴 Live' },
                { id: 'upcoming', label: '⏰ Upcoming' },
                { id: 'finished', label: '🏁 Finished' },
              ].map(f => (
                <button key={f.id} onClick={() => setFilter(f.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filter === f.id
                    ? f.id === 'joined' ? 'bg-accent-500/20 text-accent-400'
                      : f.id === 'finished' ? 'bg-white/10 text-white/60'
                      : 'bg-primary-500/20 text-primary-400'
                    : 'text-white/30 hover:text-white'
                }`}>{f.label}</button>
              ))}
            </div>
            <div className="flex gap-1 p-1 rounded-xl bg-white/5">
              {['all', 'bronze', 'silver', 'gold', 'diamond', 'legendary'].map(t => (
                <button key={t} onClick={() => setTierFilter(t)} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${tierFilter === t ? 'bg-gold-500/20 text-gold-400' : 'text-white/30 hover:text-white'}`}>{t === 'all' ? '🏷️' : t}</button>
              ))}
            </div>
          </div>
          <div className="relative w-full sm:w-64">
            <input value={search} onChange={e => setSearch(e.target.value)} className="glass-input pl-9 text-sm" placeholder="Search tournaments..." />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/></svg>
          </div>
        </div>

        <div className="text-xs text-white/30">{filtered.length} tournament{filtered.length !== 1 ? 's' : ''} found</div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="w-10 h-10 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-white/30">Loading tournaments...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🏆</div>
            <h3 className="text-lg font-display font-bold text-white mb-1">No tournaments yet</h3>
            <p className="text-sm text-white/30">Tournaments will appear here once an admin creates them</p>
          </div>
        )}

        {/* Tournament Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => {
            const isJoined = joinedIds.has(String(t.id))
            return (
            <div key={t.id} className={`glass-card-hover p-5 group relative ${isJoined ? 'border border-accent-500/30' : TIER_BORDERS[t.tier] || ''}`}>
              {isJoined && (
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-accent-500/20 border border-accent-500/30 text-accent-400 text-[10px] font-bold px-2 py-1 rounded-full">
                  ✅ Joined
                </div>
              )}
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-gradient-to-r ${TIER_COLORS[t.tier] || TIER_COLORS.bronze} text-white`}>{t.tier}</span>
                {filter !== 'finished' && (
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${t.status === 'active' ? 'bg-accent-500/20 text-accent-400' : 'bg-primary-500/20 text-primary-400'}`}>
                    {t.status === 'active' ? '🔴 Live' : '⏰ Upcoming'}
                  </span>
                )}
                {filter === 'finished' && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-white/10 text-white/40">
                    🏁 Finished
                  </span>
                )}
                {t.entry_fee === 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-accent-500/20 text-accent-400">FREE</span>}
                <span className="text-[10px] font-mono text-white/30 ml-auto">{t.asset}</span>
              </div>
              <h3 className="text-lg font-display font-bold text-white mb-1 pr-16">{t.title}</h3>
              <div className="text-2xl font-display font-black text-gold-400 neon-text-gold mb-3">{format(t.prize_pool || 0, { compact: true })}</div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="p-2 rounded-lg bg-white/[0.03] text-center">
                  <div className="text-[10px] text-white/30">Entry</div>
                  <div className="text-sm font-bold text-white">{t.entry_fee === 0 ? 'Free' : format(t.entry_fee)}</div>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.03] text-center">
                  <div className="text-[10px] text-white/30">Players</div>
                  <div className="text-sm font-bold text-white">{t.current_players || 0}/{t.max_players}</div>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.03] text-center">
                  <div className="text-[10px] text-white/30">Duration</div>
                  <div className="text-sm font-bold text-white">{t.duration_minutes < 60 ? `${t.duration_minutes}m` : t.duration_minutes < 1440 ? `${t.duration_minutes / 60}h` : `${Math.floor(t.duration_minutes / 1440)}d`}</div>
                </div>
              </div>
              <div className="mb-4">
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${((t.current_players || 0) / t.max_players) > 0.8 ? 'bg-red-500' : 'bg-accent-500'}`} style={{ width: `${((t.current_players || 0) / t.max_players) * 100}%` }} />
                </div>
              </div>
              <button
                onClick={async () => {
                  if (isJoined) {
                    navigate(t.status === 'active' ? `/trade/${t.id}` : `/lobby/${t.id}`)
                    return
                  }
                  setJoiningId(t.id)
                  try {
                    await tournamentStore.join(t.id)
                    setJoinedIds(prev => new Set([...prev, String(t.id)]))
                    navigate(t.status === 'active' ? `/trade/${t.id}` : `/lobby/${t.id}`)
                  } catch (err) {
                    if (err.message === 'Already joined') {
                      setJoinedIds(prev => new Set([...prev, String(t.id)]))
                      navigate(t.status === 'active' ? `/trade/${t.id}` : `/lobby/${t.id}`)
                    } else {
                      notify('error', err.message || 'Could not join tournament')
                    }
                  } finally {
                    setJoiningId(null)
                  }
                }}
                disabled={joiningId === t.id}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-all duration-300 disabled:opacity-50 ${
                  isJoined
                    ? t.status === 'active'
                      ? 'bg-gradient-to-r from-accent-500 to-accent-600 text-white hover:shadow-neon-green'
                      : 'bg-gradient-to-r from-accent-500/20 to-accent-600/20 text-accent-400 border border-accent-500/30 hover:bg-accent-500/30'
                    : t.status === 'active'
                      ? 'bg-gradient-to-r from-accent-500 to-accent-600 text-white hover:shadow-neon-green'
                      : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:shadow-neon-blue'
                }`}
              >
                {joiningId === t.id ? 'Joining...' :
                  isJoined
                    ? t.status === 'active' ? '⚡ Enter Trading Room' : '🏛️ Go to Lobby'
                    : t.status === 'active' ? '⚡ Enter Trading Room' : '🔔 Join & Wait'
                }
              </button>
            </div>
          )})}
        </div>
      </div>
    </div>
  )
}
