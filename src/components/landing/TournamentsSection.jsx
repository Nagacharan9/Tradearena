import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

function formatLocalDateTime(ts) {
  const d = new Date(ts)
  // Example: Mon, May 23 • 14:30
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

function mapApiTournament(t) {
  // duration_minutes-only timing: we do not rely on start_time for absolute schedule.
  // We use start_time if present only to show countdown start; otherwise fallback to 0.
  const dur = t.duration_minutes || 60
  const duration = dur < 60 ? `${dur}m` : dur < 1440 ? `${Math.floor(dur / 60)}h` : `${Math.floor(dur / 1440)}d`

  const startsIn = t.start_time
    ? Math.max(0, Math.floor((new Date(t.start_time).getTime() - Date.now()) / 1000))
    : 0

  return {
    id: t.id,
    title: t.title,
    asset: t.asset,
    prizePool: t.prize_pool || 0,
    entryFee: t.entry_fee || 0,
    players: t.current_players || 0,
    maxPlayers: t.max_players || 100,
    duration,
    startsIn,
    durationMinutes: dur,
    status: t.status === 'active' ? 'starting' : 'filling',
    tier: t.tier || 'silver',
    // Render-only local schedule hints (based on user's local time)
    estimatedStartAt: Date.now() + startsIn * 1000,
    estimatedEndAt: Date.now() + (startsIn + dur * 60) * 1000,
  }
}


const TIER_STYLES = {
  bronze: { border: 'border-orange-500/30', glow: 'hover:shadow-[0_0_30px_rgba(249,115,22,0.15)]', badge: 'bg-orange-500/20 text-orange-400', accent: 'text-orange-400' },
  silver: { border: 'border-slate-400/30', glow: 'hover:shadow-[0_0_30px_rgba(148,163,184,0.15)]', badge: 'bg-slate-400/20 text-slate-300', accent: 'text-slate-300' },
  gold: { border: 'border-gold-400/30', glow: 'hover:shadow-[0_0_30px_rgba(255,189,32,0.15)]', badge: 'bg-gold-400/20 text-gold-400', accent: 'text-gold-400' },
  diamond: { border: 'border-primary-400/30', glow: 'hover:shadow-[0_0_30px_rgba(59,142,255,0.2)]', badge: 'bg-primary-400/20 text-primary-400', accent: 'text-primary-400' },
  legendary: { border: 'border-purple-400/30', glow: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]', badge: 'bg-purple-400/20 text-purple-400', accent: 'text-purple-400' },
}

function formatTime(seconds) {
  if (seconds >= 86400) return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  if (seconds >= 60) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  return `${seconds}s`
}

function TournamentCard({ tournament }) {
  const [timeLeft, setTimeLeft] = useState(tournament.startsIn)
  const style = TIER_STYLES[tournament.tier]
  const fillPercent = (tournament.players / tournament.maxPlayers) * 100

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className={`glass-card-hover ${style.border} ${style.glow} p-5 group cursor-pointer`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${style.badge}`}>
              {tournament.tier}
            </span>
            {tournament.status === 'starting' && (
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 animate-pulse">
                Starting Soon
              </span>
            )}
          </div>
          <h3 className="text-base font-display font-bold text-white group-hover:text-primary-300 transition-colors">
            {tournament.title}
          </h3>
        </div>
        <span className="text-xs font-mono text-white/40 bg-white/5 px-2 py-1 rounded-lg">{tournament.asset}</span>
      </div>

      {/* Prize Pool */}
      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-2xl font-display font-black text-gold-400 neon-text-gold">${tournament.prizePool.toLocaleString()}</span>
        <span className="text-xs text-white/30">prize pool</span>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 rounded-lg bg-white/[0.03]">
          <div className="text-xs text-white/30 mb-0.5">Entry</div>
          <div className="text-sm font-bold text-white">${tournament.entryFee}</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/[0.03]">
          <div className="text-xs text-white/30 mb-0.5">Duration</div>
          <div className="text-sm font-bold text-white">{tournament.duration}</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/[0.03]">
          <div className="text-xs text-white/30 mb-0.5">Starts In</div>
          <div className={`text-sm font-bold font-mono ${timeLeft < 300 ? 'text-red-400' : style.accent}`}>
            {formatTime(timeLeft)}
          </div>
          <div className="text-[10px] text-white/25 mt-1">
            {formatLocalDateTime(tournament.estimatedStartAt)}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 text-[10px] text-white/25 mb-4">
        <span>Ends</span>
        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
          {formatLocalDateTime(tournament.estimatedEndAt)}
        </span>
      </div>


      {/* Player Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-white/40 mb-1.5">
          <span>{tournament.players}/{tournament.maxPlayers} players</span>
          <span>{Math.round(fillPercent)}% full</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{ 
              width: `${fillPercent}%`,
              background: fillPercent > 90 
                ? 'linear-gradient(90deg, #ef4444, #f97316)' 
                : fillPercent > 60 
                ? 'linear-gradient(90deg, #f99b07, #ffbd20)'
                : 'linear-gradient(90deg, #3b8eff, #00dc6e)' 
            }}
          />
        </div>
      </div>

      {/* Join Button */}
      <button className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 transition-all duration-300 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
        Join Tournament →
      </button>
    </div>
  )
}

export default function TournamentsSection() {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/tournaments')
      .then(r => r.ok ? r.json() : { tournaments: [] })
      .then(d => {
        const list = (d.tournaments || [])
          .filter(t => t.status === 'active' || t.status === 'upcoming')
          .slice(0, 6)
          .map(mapApiTournament)
        setTournaments(list)
      })
      .catch(() => setTournaments([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section id="tournaments" className="relative py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-dark-950 via-primary-950/5 to-dark-950 pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary-400 mb-3">
            Competitions
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
            <span className="gradient-text">Tournaments</span>
          </h2>
          <p className="max-w-xl mx-auto text-white/40">
            Real events created by admins — no fake demo rooms. Join when a tournament goes live.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-white/30 text-sm">Loading tournaments…</div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-16 glass-card max-w-lg mx-auto">
            <div className="text-4xl mb-3">🏆</div>
            <p className="text-white font-semibold mb-1">No tournaments live right now</p>
            <p className="text-sm text-white/40 mb-6">Check back soon or sign in to see upcoming events.</p>
            <Link to="/register" className="btn-primary inline-block">Get Started</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {tournaments.map((t) => (
              <TournamentCard key={t.id} tournament={t} />
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <Link to="/login" className="px-8 py-3 rounded-xl text-sm font-medium text-white/60 border border-white/10 hover:border-primary-500/30 hover:text-primary-400 hover:bg-primary-500/5 transition-all duration-300 inline-block">
            Sign in to view all tournaments →
          </Link>
        </div>
      </div>
    </section>
  )
}
