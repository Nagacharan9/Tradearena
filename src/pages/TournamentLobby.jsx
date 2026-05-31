import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import tournamentStore from '../services/tournamentStore'

export default function TournamentLobby() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { notify } = useNotification()
  const [countdown, setCountdown] = useState(300)
  const [participants, setParticipants] = useState([])
  const [joined, setJoined] = useState(false)
  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)

  // Fetch real tournament data + participants
  useEffect(() => {
    const token = localStorage.getItem('tradearena_token')
    fetch(`/api/tournaments/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(data => {
        const t = data.tournament || data
        if (t) {
          setTournament(t)

          // If already active, go straight to trading room
          if (t.status === 'active') {
            navigate(`/trade/${id}`, { replace: true })
            return
          }

          // Calculate real countdown from start_time
          if (t.start_time) {
            const secsLeft = Math.max(0, Math.floor((new Date(t.start_time).getTime() - Date.now()) / 1000))
            setCountdown(secsLeft)
          } else {
            setCountdown(300)
          }

          // Server returns leaderboard sorted by balance DESC
          const raw = data.leaderboard || t.participants || []
          if (raw.length > 0) {
            const mapped = raw.map((p, i) => ({
              position: i + 1,
              name: p.username || p.name || `Player ${i + 1}`,
              country: p.country || '🌍',
              user_id: p.user_id,
              isYou: user && (p.user_id === user.id || p.username === user.username),
            }))
            setParticipants(mapped)
            if (user && mapped.some(p => p.isYou)) setJoined(true)
          }
        }
      })
      .catch(() => tournamentStore.getById(id).then(t => {
        if (t) {
          setTournament(t)
          if (t.status === 'active') { navigate(`/trade/${id}`, { replace: true }); return }
          if (t.start_time) {
            setCountdown(Math.max(0, Math.floor((new Date(t.start_time).getTime() - Date.now()) / 1000)))
          } else {
            setCountdown(300)
          }
        }
      }))
      .finally(() => setLoading(false))
  }, [id, user, navigate])

  // Poll participants every 5s — also re-check status to catch upcoming→active transition
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const token = localStorage.getItem('tradearena_token')
        const res = await fetch(`/api/tournaments/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) return
        const data = await res.json()
        const t = data.tournament || {}

        // If server says it's now active, go to trading room immediately
        if (t.status === 'active') {
          navigate(`/trade/${id}`, { replace: true })
          return
        }

        const raw = data.leaderboard || []
        if (raw.length > 0) {
          const mapped = raw.map((p, i) => ({
            position: i + 1,
            name: p.username || p.name || `Player ${i + 1}`,
            country: p.country || '🌍',
            user_id: p.user_id,
            isYou: user && (p.user_id === user.id || p.username === user.username),
          }))
          setParticipants(mapped)
          setTournament(prev => prev ? { ...prev, current_players: raw.length } : prev)
        }
      } catch (_) {}
    }, 3000)
    return () => clearInterval(poll)
  }, [id, user, navigate])

  // Countdown timer — counts down to start_time using real clock
  useEffect(() => {
    if (!tournament || tournament.status === 'active') return

    const timer = setInterval(() => {
      if (!tournament?.start_time) {
        setCountdown(c => Math.max(0, c - 1))
        return
      }
      const secsLeft = Math.max(0, Math.floor((new Date(tournament.start_time).getTime() - Date.now()) / 1000))
      setCountdown(secsLeft)
      if (secsLeft <= 0) {
        clearInterval(timer)
        // Poll will catch the active status and redirect; also try direct navigate
        navigate(`/trade/${id}`)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [id, navigate, tournament])


  const mins = Math.floor(countdown / 60)
  const secs = countdown % 60

  const handleJoin = async () => { 
    // Reset displayed error
    setJoinError('')
    setJoinError('')
    setJoining(true)
    try {
      await tournamentStore.join(id)
      setJoined(true)
      notify('tournament_joined', `Joined tournament: ${tournament?.title || 'Trading Room'}`)
      if (user) {
        setParticipants(prev => {
          const alreadyIn = prev.some(p => p.isYou)
          if (alreadyIn) return prev
          return [
            ...prev,
            {
              position: prev.length + 1,
              name: user.username,
              country: user.country || '🌍',
              isYou: true,
            },
          ]
        })
      }
      if (tournament) {
        setTournament({ ...tournament, current_players: (tournament.current_players || 0) + 1 })
      }
    } catch (err) {
      if (err.message === 'Already joined') {
        setJoined(true)
      } else {
        setJoinError(err.message || 'Failed to join tournament')
      }
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="glass-card p-8 max-w-md text-center">
          <div className="text-5xl mb-4">🏆</div>
          <h2 className="text-xl font-display font-bold text-white mb-2">Tournament Not Found</h2>
          <p className="text-sm text-white/40 mb-6">This tournament doesn't exist or has ended.</p>
          <Link to="/tournaments" className="btn-primary inline-block">← Browse Tournaments</Link>
        </div>
      </div>
    )
  }

  const prizeList = tournament.prizes || [
    { rank: 1, percentage: 50 }, { rank: 2, percentage: 30 }, { rank: 3, percentage: 20 }
  ]

  const myEntry = participants.find(p => p.isYou)

  return (
    <div className="min-h-screen bg-dark-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-gradient" />
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-gold-500/5 rounded-full blur-[150px]" />

      <header className="relative z-10 bg-dark-900/50 backdrop-blur-xl border-b border-white/5 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/tournaments" className="flex items-center gap-2 text-white/40 hover:text-white transition-all text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back
          </Link>
          <span className="text-xs font-bold text-gold-400 px-3 py-1 rounded-lg bg-gold-500/10 border border-gold-500/20 uppercase">{tournament.tier} tier</span>
        </div>
      </header>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Title + Countdown */}
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-display font-black text-white mb-2">{tournament.title}</h1>
          <p className="text-white/30 mb-6">{tournament.asset} • {tournament.duration_minutes < 60 ? `${tournament.duration_minutes}m` : `${tournament.duration_minutes / 60}h`} duration</p>

          <div className="inline-flex items-center gap-1 mb-6">
            <div className="glass-card px-5 py-4 text-center min-w-[70px]">
              <div className="text-3xl font-mono font-black text-white">{String(mins).padStart(2, '0')}</div>
              <div className="text-[10px] text-white/30 uppercase">Min</div>
            </div>
            <span className="text-2xl font-bold text-white/20 animate-pulse">:</span>
            <div className="glass-card px-5 py-4 text-center min-w-[70px]">
              <div className={`text-3xl font-mono font-black ${countdown <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>{String(secs).padStart(2, '0')}</div>
              <div className="text-[10px] text-white/30 uppercase">Sec</div>
            </div>
          </div>

          <div className="text-xs text-white/30 mb-4">
            {tournament.start_time && tournament.end_time ? (
              <span>
                Starts: <span className="text-white/50 font-bold">
                  {new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(tournament.start_time))}
                </span> • Ends: <span className="text-white/50 font-bold">
                  {new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(tournament.end_time))}
                </span>
              </span>
            ) : null}
          </div>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Prize Split */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-display font-bold text-white mb-4">🏆 Prize Pool — <span className="text-gold-400">${(tournament.prize_pool || 0).toLocaleString()}</span></h3>
            <div className="space-y-3">
              {prizeList.map((p, i) => {
                const amount = Math.round((tournament.prize_pool || 0) * p.percentage / 100)
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-gold-400 text-dark-950' : i === 1 ? 'bg-slate-300 text-dark-950' : i === 2 ? 'bg-orange-500 text-white' : 'bg-white/10 text-white/50'}`}>
                      #{p.rank}
                    </div>
                    <div className="flex-1">
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${i === 0 ? 'bg-gold-400' : i === 1 ? 'bg-slate-300' : 'bg-orange-500'}`} style={{ width: `${p.percentage}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold text-white">${amount}</span>
                    <span className="text-xs text-white/20">{p.percentage}%</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Info */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-display font-bold text-white mb-4">📋 Tournament Info</h3>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm"><span className="text-white/40">Asset</span><span className="font-bold text-white">{tournament.asset}</span></div>
              <div className="flex justify-between text-sm"><span className="text-white/40">Duration</span><span className="font-bold text-white">{tournament.duration_minutes < 60 ? `${tournament.duration_minutes}m` : `${tournament.duration_minutes / 60}h`}</span></div>
              <div className="flex justify-between text-sm"><span className="text-white/40">Starting Balance</span><span className="font-bold text-accent-400">${(tournament.tournament_balance ?? tournament.starting_balance ?? 10000).toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-white/40">Max Players</span><span className="font-bold text-white">{tournament.max_players}</span></div>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.03] grid grid-cols-2 gap-2 text-center">
              <div><div className="text-xs text-white/20">Entry Fee</div><div className="text-sm font-bold text-white">{tournament.entry_fee === 0 ? 'Free' : `$${tournament.entry_fee}`}</div></div>
              <div><div className="text-xs text-white/20">Players</div><div className="text-sm font-bold text-white">{tournament.current_players || 0}/{tournament.max_players}</div></div>
            </div>
          </div>
        </div>

        {/* ── Your Position (if joined) ── */}
        {joined && myEntry && (
          <div className="glass-card p-4 border border-primary-500/30 bg-primary-500/5 flex items-center gap-4">
            <div className="shrink-0 text-center min-w-[56px]">
              <div className="text-3xl font-black text-primary-400">#{myEntry.position}</div>
              <div className="text-[10px] text-white/30 mt-0.5">Your Slot</div>
            </div>
            <div className="w-[1px] h-10 bg-white/10 shrink-0" />
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-base font-bold text-white shrink-0">
              {user?.username?.[0] || 'Y'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">{user?.username || 'You'}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary-500/20 text-primary-400 font-black">YOU</span>
                <span className="text-sm">{user?.country || '🌍'}</span>
              </div>
              <div className="text-xs text-white/30 mt-0.5">Registered for this tournament</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[10px] text-white/30">Joined</div>
              <div className="text-xs font-bold text-accent-400 mt-0.5">✅ Confirmed</div>
            </div>
          </div>
        )}

        {/* Participants List */}
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h3 className="text-sm font-display font-bold text-white">
              👥 Participants
              <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-white/5 text-white/40">
                {participants.length}/{tournament.max_players}
              </span>
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse" />
              <span className="text-[10px] text-white/30">Live</span>
            </div>
          </div>

          {participants.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">🏁</div>
              <p className="text-sm text-white/30 font-medium">No participants yet</p>
              <p className="text-xs text-white/15 mt-1">Be the first to join this tournament!</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.03]">
              {participants.map((p, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-5 py-3 transition-all animate-scale-in ${p.isYou ? 'bg-primary-500/5 border-l-2 border-l-primary-500' : 'hover:bg-white/[0.02]'}`}
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  {/* Position badge */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                    p.position === 1 ? 'bg-gold-400 text-dark-950' :
                    p.position === 2 ? 'bg-slate-300 text-dark-950' :
                    p.position === 3 ? 'bg-orange-500 text-white' :
                    p.isYou ? 'bg-primary-500/20 text-primary-400' :
                    'bg-white/5 text-white/30'
                  }`}>
                    {p.position}
                  </div>

                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    p.isYou
                      ? 'bg-gradient-to-br from-primary-500 to-accent-500 text-white ring-2 ring-primary-400/40'
                      : 'bg-gradient-to-br from-primary-500/30 to-accent-500/30 text-white/60'
                  }`}>
                    {p.name[0]}
                  </div>

                  {/* Name + country */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold truncate ${p.isYou ? 'text-primary-400' : 'text-white'}`}>
                        {p.isYou ? 'You' : p.name}
                      </span>
                      {p.isYou && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary-500/20 text-primary-400 font-black shrink-0">YOU</span>
                      )}
                      <span className="text-sm shrink-0">{p.country}</span>
                    </div>
                    {p.position <= 3 && (
                      <div className="text-[10px] text-white/25">
                        {p.position === 1 ? '🥇 Top seed' : p.position === 2 ? '🥈 2nd seed' : '🥉 3rd seed'}
                      </div>
                    )}
                  </div>

                  {/* Slot tag */}
                  <div className={`text-[10px] font-bold px-2 py-1 rounded-lg border shrink-0 ${
                    p.isYou
                      ? 'text-primary-400 bg-primary-500/10 border-primary-500/20'
                      : 'text-white/20 bg-white/[0.03] border-white/5'
                  }`}>
                    Slot #{p.position}
                  </div>
                </div>
              ))}

              {/* Empty slots */}
              {participants.length < tournament.max_players && (
                <div className="px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.02] border border-dashed border-white/10 flex items-center justify-center text-xs text-white/20 shrink-0">
                    +{tournament.max_players - participants.length}
                  </div>
                  <span className="text-xs text-white/20 italic">
                    {tournament.max_players - participants.length} slot{tournament.max_players - participants.length !== 1 ? 's' : ''} remaining
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Join Button */}
        {joinError && (
          <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-center">
            {joinError}
          </div>
        )}

        {!joined ? (
          <button onClick={handleJoin} disabled={joining} className="btn-gold w-full !py-4 text-lg disabled:opacity-50">
            {joining ? 'Joining...' : `⚡ Join Tournament ${tournament.entry_fee > 0 ? `— $${tournament.entry_fee} Entry` : '— Free Entry'}`}
          </button>
        ) : (
          <div className="text-center glass-card p-4 border-accent-500/20">
            <div className="text-accent-400 font-bold mb-1">✅ You're in! Waiting for tournament to start...</div>
            <div className="text-xs text-white/30">You'll be redirected to the Trading Room automatically</div>
          </div>
        )}
      </div>
    </div>
  )
}
