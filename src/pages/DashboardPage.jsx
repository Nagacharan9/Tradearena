import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCurrency } from '../contexts/CurrencyContext'
import tournamentStore from '../services/tournamentStore'
import { useNotification, TOAST_STYLES } from '../contexts/NotificationContext'
import api from '../services/api'

const TIER_COLORS = {
  bronze: 'from-orange-500 to-orange-700',
  silver: 'from-slate-300 to-slate-500',
  gold: 'from-gold-400 to-gold-600',
  diamond: 'from-primary-400 to-primary-600',
  legendary: 'from-purple-400 to-purple-600',
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const { format } = useCurrency()
  const { notify, notifications, unreadCount, markRead, markAllRead, clearAll } = useNotification()
  const navigate = useNavigate()
  const [tournaments, setTournaments] = useState([])
  const [joinedIds, setJoinedIds] = useState(new Set())
  const [activeTab, setActiveTab] = useState('all')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [loading, setLoading] = useState(true)
  const [joiningId, setJoiningId] = useState(null)

  const displayUser = user || { username: 'Trader', rank_level: 1, win_count: 0, loss_count: 0, total_tournaments: 0, country: '🌍' }

  // Fetch tournaments from store (API + localStorage)
  useEffect(() => {
    tournamentStore.getAll()
      .then(data => setTournaments(data))
      .catch(() => setTournaments([]))
      .finally(() => setLoading(false))
    api.getJoinedTournaments()
      .then(data => setJoinedIds(new Set((data.tournaments || []).map(t => String(t.id)))))
      .catch(() => {})
  }, [])

  const handleJoinTournament = async (tournament) => {
    const alreadyJoined = joinedIds.has(String(tournament.id))
    if (alreadyJoined) {
      navigate(tournament.status === 'active' ? `/trade/${tournament.id}` : `/lobby/${tournament.id}`)
      return
    }
    setJoiningId(tournament.id)
    try {
      await tournamentStore.join(tournament.id)
      setJoinedIds(prev => new Set([...prev, String(tournament.id)]))
      navigate(tournament.status === 'active' ? `/trade/${tournament.id}` : `/lobby/${tournament.id}`)
    } catch (err) {
      if (err.message === 'Already joined') {
        setJoinedIds(prev => new Set([...prev, String(tournament.id)]))
        navigate(tournament.status === 'active' ? `/trade/${tournament.id}` : `/lobby/${tournament.id}`)
      } else if (err.message === 'Insufficient balance') {
        notify('error', 'Insufficient balance for entry fee — deposit funds in Wallet')
      } else {
        notify('error', err.message || 'Could not join tournament')
      }
    } finally {
      setJoiningId(null)
    }
  }

  const filteredTournaments = tournaments.filter(t => {
    if (activeTab === 'joined') return joinedIds.has(String(t.id))
    if (activeTab === 'active') return t.status === 'active'
    if (activeTab === 'upcoming') return t.status === 'upcoming'
    if (activeTab === 'finished') return t.status === 'completed'
    return t.status !== 'completed'
  })

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-72 bg-dark-900/95 backdrop-blur-xl border-r border-white/5 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full p-5">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-lg font-display font-bold">
              <span className="gradient-text">Trade</span><span className="text-white">Arena</span>
            </span>
          </Link>

          {/* User Card */}
          <div className="glass-card p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-lg font-bold">
                {displayUser.username[0]}
              </div>
              <div>
                <div className="font-semibold text-white flex items-center gap-1.5">
                  {displayUser.username} <span>{displayUser.country}</span>
                </div>
                <div className="text-xs text-white/40">Level {displayUser.rank_level} Trader</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-1.5 rounded-lg bg-white/[0.03]">
                <div className="text-sm font-bold text-accent-400">{displayUser.win_count}</div>
                <div className="text-[10px] text-white/30">Wins</div>
              </div>
              <div className="p-1.5 rounded-lg bg-white/[0.03]">
                <div className="text-sm font-bold text-red-400">{displayUser.loss_count}</div>
                <div className="text-[10px] text-white/30">Losses</div>
              </div>
              <div className="p-1.5 rounded-lg bg-white/[0.03]">
                <div className="text-sm font-bold text-gold-400">{displayUser.total_tournaments}</div>
                <div className="text-[10px] text-white/30">Played</div>
              </div>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 space-y-1">
            {[
              { icon: '🏠', label: 'Dashboard', path: '/dashboard', active: true },
              { icon: '🏆', label: 'Tournaments', path: '/tournaments' },
              { icon: '🏅', label: 'Leaderboard', path: '/leaderboard' },
              { icon: '💰', label: 'Wallet', path: '/wallet' },
              { icon: '👤', label: 'Profile', path: '/profile' },
              { icon: '🤝', label: 'Referrals', path: '/referrals' },
              { icon: '🎖️', label: 'Achievements', path: '/profile' },
            ].map(item => (
              <Link key={item.label} to={item.path} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                item.active ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20' : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}>
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            ))}

            {/* Admin — only visible to admin role */}
            {displayUser.role === 'admin' && (
              <Link to="/admin" className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400/60 hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/10 transition-all duration-200">
                <span className="text-base">⚙️</span>
                Admin Panel
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">ADMIN</span>
              </Link>
            )}
          </nav>

          {/* Wallet Balance */}
          <div className="glass-card p-4 mb-4">
            <div className="text-xs text-white/30 mb-1">Real Balance</div>
            <div className="text-2xl font-display font-bold text-accent-400">{format(displayUser.balance || 0)}</div>
            <Link to="/wallet" className="w-full mt-3 py-2 rounded-lg text-xs font-bold bg-accent-500/20 text-accent-400 hover:bg-accent-500/30 transition-all block text-center">
              + Deposit
            </Link>
          </div>

          {/* Logout */}
          <button onClick={() => { logout?.(); navigate('/') }} className="w-full py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-red-400 hover:bg-red-500/5 transition-all">
            Sign Out
          </button>
        </div>
      </aside>

      {/* Sidebar Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main Content */}
      <main className="flex-1 min-h-screen relative">
        {/* Notification Panel Overlay */}
        {showNotifications && <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowNotifications(false)} />}
        
        {/* Notification Slide-out Panel */}
        <div className={`fixed inset-y-0 right-0 z-50 w-full sm:w-80 bg-dark-900 border-l border-white/5 transform transition-transform duration-300 flex flex-col ${showNotifications ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Notifications</h2>
            <div className="flex gap-2">
              <button onClick={markAllRead} className="text-xs text-primary-400 hover:text-primary-300">Mark all read</button>
              <button onClick={clearAll} className="text-xs text-white/40 hover:text-white">Clear</button>
              <button onClick={() => setShowNotifications(false)} className="text-white/40 hover:text-white ml-2">✕</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {notifications.length === 0 ? (
              <div className="text-center py-10 text-white/30 text-sm">No notifications</div>
            ) : (
              notifications.map(n => {
                const style = TOAST_STYLES[n.type] || TOAST_STYLES.info
                return (
                  <div key={n.id} onClick={() => markRead(n.id)} className={`relative p-3 mb-2 rounded-xl border transition-all cursor-pointer ${n.read ? 'bg-white/[0.02] border-transparent opacity-60' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                    {!n.read && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary-500" />}
                    <div className="flex gap-3">
                      <span className="text-xl shrink-0">{style.icon}</span>
                      <div>
                        <div className={`text-sm font-medium ${n.read ? 'text-white/60' : 'text-white'}`}>{n.message}</div>
                        <div className="text-[10px] text-white/30 mt-1">{new Date(n.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-dark-950/80 backdrop-blur-xl border-b border-white/5 px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round"/></svg>
              </button>
              <div>
                <h1 className="text-xl font-display font-bold text-white">Dashboard</h1>
                <p className="text-xs text-white/30">Welcome back, {displayUser.username}!</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowNotifications(true)} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all relative">
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-dark-950">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-4 lg:p-8 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Win Rate', value: `${displayUser.win_count + displayUser.loss_count > 0 ? Math.round((displayUser.win_count / (displayUser.win_count + displayUser.loss_count)) * 100) : 0}%`, icon: '📈', color: 'text-accent-400' },
              { label: 'Real Balance', value: format(displayUser.balance || 0), icon: '💰', color: 'text-gold-400' },
              { label: 'Active Tournaments', value: tournaments.filter(t => t.status === 'active').length, icon: '🏆', color: 'text-primary-400' },
              { label: 'Bonus Balance', value: format(displayUser.bonus_balance || 0), icon: '🎁', color: 'text-purple-400' },
            ].map(stat => (
              <div key={stat.label} className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/30">{stat.label}</span>
                  <span className="text-xl">{stat.icon}</span>
                </div>
                <div className={`text-2xl font-display font-bold ${stat.color}`}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Tournament Tabs */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1 p-1 rounded-xl bg-white/5">
                {[
                  { id: 'joined', label: `✅ Joined${joinedIds.size > 0 ? ` (${joinedIds.size})` : ''}` },
                  { id: 'active', label: '🔴 Live' },
                  { id: 'upcoming', label: '⏰ Upcoming' },
                  { id: 'finished', label: '🏁 Finished' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      activeTab === tab.id
                        ? tab.id === 'joined' ? 'bg-accent-500/20 text-accent-400'
                          : tab.id === 'finished' ? 'bg-white/10 text-white/60'
                          : 'bg-primary-500/20 text-primary-400'
                        : 'text-white/40 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tournament Cards */}
            {loading ? (
              <div className="text-center py-12">
                <div className="w-10 h-10 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-white/30">Loading tournaments...</p>
              </div>
            ) : filteredTournaments.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-3">🏆</div>
                <h3 className="text-lg font-display font-bold text-white mb-1">No tournaments available</h3>
                <p className="text-sm text-white/30">Check back soon — new tournaments will be listed here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTournaments.map(t => {
                  const isJoined = joinedIds.has(String(t.id))
                  return (
                  <div key={t.id} className={`glass-card-hover p-5 group relative ${isJoined ? 'border border-accent-500/30' : ''}`}>
                    {isJoined && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 bg-accent-500/20 border border-accent-500/30 text-accent-400 text-[10px] font-bold px-2 py-1 rounded-full">
                        ✅ Joined
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-gradient-to-r ${TIER_COLORS[t.tier] || TIER_COLORS.bronze} text-white`}>{t.tier}</span>
                          {activeTab !== 'finished' && (
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${t.status === 'active' ? 'bg-accent-500/20 text-accent-400' : 'bg-primary-500/20 text-primary-400'}`}>
                              {t.status === 'active' ? '🔴 Live' : '⏰ Upcoming'}
                            </span>
                          )}
                          {activeTab === 'finished' && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-white/10 text-white/40">
                              🏁 Finished
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-display font-bold text-white pr-16">{t.title}</h3>
                      </div>
                    </div>
                    <div className="flex items-end justify-between mb-3">
                      <div className="text-2xl font-display font-black text-gold-400 neon-text-gold">
                        {format(t.prize_pool || 0, { compact: true })} <span className="text-xs text-white/30 font-normal">prize</span>
                      </div>
                      <span className="text-xs font-mono text-white/40 bg-white/5 px-2 py-1 rounded-lg">{t.asset}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="p-2 rounded-lg bg-white/[0.03] text-center">
                        <div className="text-xs text-white/30">Entry</div>
                        <div className="text-sm font-bold text-white">{t.entry_fee === 0 ? 'Free' : format(t.entry_fee)}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.03] text-center">
                        <div className="text-xs text-white/30">Players</div>
                        <div className="text-sm font-bold text-white">{t.current_players || 0}/{t.max_players}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.03] text-center">
                        <div className="text-xs text-white/30">Duration</div>
                        <div className="text-sm font-bold text-white">{t.duration_minutes < 60 ? `${t.duration_minutes}m` : `${t.duration_minutes / 60}h`}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoinTournament(t)}
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
                      {joiningId === t.id ? 'Loading...' :
                        isJoined
                          ? t.status === 'active' ? '⚡ Enter Trading Room' : '🏛️ Go to Lobby'
                          : t.status === 'active' ? '⚡ Enter Trading Room' : '🔔 Join Tournament'
                      }
                    </button>
                  </div>
                )})}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
