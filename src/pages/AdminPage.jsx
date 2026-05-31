import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import tournamentStore from '../services/tournamentStore'

const TABS = ['Overview', 'Tournaments', 'Users', 'Market', 'Bots', 'Approvals', 'Payments']


export default function AdminPage() {
  const [tab, setTab] = useState('Overview')

  const [marketMode, setMarketMode] = useState('balanced')
  const [volatility, setVolatility] = useState(1.0)

  // Real data — fetched from API
  const [stats, setStats] = useState({
    users: 0, bots: 0, tournaments: 0, active: 0, prize: 0,
    deposits: 0, pending: 0, pendingDepositsCount: 0, pendingDepositVolume: 0,
    walletBalance: 0, trades: 0, fetchedAt: null,
  })
  const [users, setUsers] = useState([])
  const [pendingTx, setPendingTx] = useState([])

  // Admin user search + overview
  const [adminUserSearch, setAdminUserSearch] = useState('')
  const [adminUserSearching, setAdminUserSearching] = useState(false)
  const [selectedAdminUser, setSelectedAdminUser] = useState(null)
  const [selectedAdminUserOverview, setSelectedAdminUserOverview] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  // Tournament Management state
  const [tournamentsList, setTournamentsList] = useState([])
  const [managingTourney, setManagingTourney] = useState(null)
  const [manualBotName, setManualBotName] = useState('')
  const [manualBotBalance, setManualBotBalance] = useState('')
  const [forceBalances, setForceBalances] = useState({})
  
  const [injectCount, setInjectCount] = useState('10')
  const [injectMin, setInjectMin] = useState('1000')
  const [injectMax, setInjectMax] = useState('10000')
  const [injecting, setInjecting] = useState(false)

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('tradearena_token')}`,
  })

  const formatUsd = (n) => {
    const v = Number(n) || 0
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
    if (v >= 10_000) return `$${(v / 1_000).toFixed(1)}K`
    return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const fetchAllData = async () => {
    setRefreshing(true)
    try {
       const [statsRes, usersRes, txRes] = await Promise.all([
         fetch('/api/admin/stats', { headers: authHeaders(), cache: 'no-store' }),
         fetch('/api/admin/users', { headers: authHeaders(), cache: 'no-store' }),
         fetch('/api/admin/transactions', { headers: authHeaders(), cache: 'no-store' }),
       ])
       if (statsRes.ok) {
         const d = await statsRes.json()
         setStats(d)
       }
       if (usersRes.ok) {
         const d = await usersRes.json()
         setUsers(d.users || [])
       }
       if (txRes.ok) {
         const d = await txRes.json()
         setPendingTx((d.transactions || []).filter(t => t.status === 'pending'))
       }
       const tourneys = await tournamentStore.getAll()
       // Filter out completed tournaments as they are considered "deleted" via soft-delete
       const activeTourneys = tourneys.filter(t => t.status !== 'completed')
       setTournamentsList(activeTourneys)
    } catch (_) {}
    setRefreshing(false)
  }

  useEffect(() => {
    fetchAllData()
  }, [])

  // Refetch when switching to data-heavy tabs (fixes stale Overview after Approvals)
  useEffect(() => {
    if (tab === 'Overview' || tab === 'Users' || tab === 'Approvals' || tab === 'Tournaments' || tab === 'Bots') {
      fetchAllData()
    }
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdminUserSearch = async () => {
    const q = adminUserSearch.trim()
    if (!q) return
    setAdminUserSearching(true)
    try {
      const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(q)}`, {
        headers: authHeaders(),
        cache: 'no-store',
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Search failed')
      }
      const d = await res.json().catch(() => ({}))
      setUsers(d.users || [])
      setSelectedAdminUser(null)
      setSelectedAdminUserOverview(null)
    } catch (e) {
      alert(e.message)
    } finally {
      setAdminUserSearching(false)
    }
  }

  const loadAdminUserOverview = async (user) => {
    if (!user?.id) return
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}/overview`, {
        headers: authHeaders(),
        cache: 'no-store',
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to load user overview')
      }
      const d = await res.json().catch(() => ({}))
      setSelectedAdminUser(user)
      setSelectedAdminUserOverview(d)
    } catch (e) {
      alert(e.message)
    }
  }


  const handleTransactionAction = async (id, action) => {
    try {
      const res = await fetch(`/api/admin/transactions/${id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('tradearena_token')}`
        },
        body: JSON.stringify({ action })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to process transaction')
      }
      fetchAllData()
    } catch (err) {
      alert(err.message)
    }
  }


  const handleManageTournament = async (tId) => {
    try {
      const res = await fetch(`/api/tournaments/${tId}`, { headers: authHeaders(), cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setManagingTourney(data)
      } else {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Server error: ${res.status}`)
      }
    } catch(err) {
      // Fallback for locally created tournaments before cache fix
      const localT = await tournamentStore.getById(tId)
      if (localT && String(tId).startsWith('t_')) {
        setManagingTourney({ tournament: localT, leaderboard: [] })
      } else {
        alert('Failed to load tournament: ' + err.message)
      }
    }
  }

  const handleAddManualBot = async () => {
    if (!manualBotName || !manualBotBalance) return
    try {
      const res = await fetch(`/api/admin/tournaments/${managingTourney.tournament.id}/add-bot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('tradearena_token')}`
        },
        body: JSON.stringify({ name: manualBotName, balance: parseFloat(manualBotBalance) })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to add bot')
      setManualBotName('')
      setManualBotBalance('')
      // Refresh leaderboard
      await handleManageTournament(managingTourney.tournament.id)
      await fetchAllData()
    } catch(err) {
      alert(err.message)
    }
  }

  const handleInjectBots = async () => {
    const count = parseInt(injectCount)
    if (!Number.isFinite(count) || count <= 0) return
    setInjecting(true)
    try {
      const res = await fetch(`/api/admin/tournaments/${managingTourney.tournament.id}/inject-bots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('tradearena_token')}`
        },
        body: JSON.stringify({ count, minBalance: parseFloat(injectMin), maxBalance: parseFloat(injectMax) })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Failed to inject bots')
      }
      // Refresh leaderboard
      await handleManageTournament(managingTourney.tournament.id)
      await fetchAllData()
      alert(`Successfully injected ${data.count ?? injectCount} players!`)
    } catch(err) {
      alert(err.message)
    } finally {
      setInjecting(false)
    }
  }

  const handleForceRank = async (userId) => {
    const bal = forceBalances[userId]
    if (bal === undefined) return
    try {
      const res = await fetch(`/api/admin/tournaments/${managingTourney.tournament.id}/force-rank`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('tradearena_token')}`
        },
        body: JSON.stringify({ userId, newBalance: parseFloat(bal) })
      })
      if (!res.ok) throw new Error('Failed to update balance')
      // Refresh leaderboard
      handleManageTournament(managingTourney.tournament.id)
      setForceBalances(prev => { const n = {...prev}; delete n[userId]; return n })
    } catch(err) {
      alert(err.message)
    }
  }

  const [tourneyForm, setTourneyForm] = useState({ title: '', asset: 'BTC/USD', entry_fee: 10, prize_pool: 1000, duration: 60, balance: 10000, max_players: 200, tier: 'silver', status: 'upcoming', bot_enabled: true, bot_difficulty: 'medium', daily_repeat: false, bot_min: 0, bot_max: 0, start_time: '' })
  const [prizes, setPrizes] = useState([
    { rank: 1, percentage: 50 },
    { rank: 2, percentage: 30 },
    { rank: 3, percentage: 20 },
  ])
  const totalPct = prizes.reduce((sum, p) => sum + p.percentage, 0)
  const [botForm, setBotForm] = useState({ name: '', country: '🇺🇸', difficulty: 'high', personality: 'aggressive' })
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState(false)
  const [creatingBot, setCreatingBot] = useState(false)

  const handleCreateTournament = async () => {
    if (totalPct !== 100 || !tourneyForm.title) return
    setCreating(true)
    try {
      await tournamentStore.create({
        title: tourneyForm.title,
        asset: tourneyForm.asset,
        entry_fee: tourneyForm.entry_fee,
        prize_pool: tourneyForm.prize_pool,
        duration_minutes: tourneyForm.duration,
        starting_balance: tourneyForm.balance,
        max_players: tourneyForm.max_players,
        tier: tourneyForm.tier,
        status: tourneyForm.status,
        bot_enabled: tourneyForm.bot_enabled,
        bot_difficulty: tourneyForm.bot_difficulty,
        bot_min: tourneyForm.bot_min,
        bot_max: tourneyForm.bot_max,
        daily_repeat: tourneyForm.daily_repeat,
        start_time: tourneyForm.start_time,
        prizes: prizes,
      })
      setCreated(true)
      setTimeout(() => setCreated(false), 3000)
      // Reset form
      setTourneyForm({ title: '', asset: 'BTC/USD', entry_fee: 10, prize_pool: 1000, duration: 60, balance: 10000, max_players: 200, tier: 'silver', status: 'upcoming', bot_enabled: true, bot_difficulty: 'medium', daily_repeat: false, bot_min: 0, bot_max: 0, start_time: '' })
      await fetchAllData()
    } catch (e) {
      alert('Error creating tournament: ' + e.message)
    }
    setCreating(false)
  }

  const handleCreatePuppetBot = async () => {
    const name = botForm.name.trim()
    if (!name) return

    setCreatingBot(true)
    try {
      const res = await fetch('/api/admin/bots/puppet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('tradearena_token')}`
        },
        body: JSON.stringify({
          name,
          country: botForm.country,
          difficulty: botForm.difficulty,
          personality: botForm.personality,
        })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to create bot')

      setBotForm(prev => ({ ...prev, name: '' }))
      await fetchAllData()
      alert(`Created bot ${data.name || name}`)
    } catch (err) {
      alert(err.message)
    } finally {
      setCreatingBot(false)
    }
  }

  const [paymentConfigs, setPaymentConfigs] = useState({})
  const [paymentConfigsLoading, setPaymentConfigsLoading] = useState(false)
  const [paymentConfigsError, setPaymentConfigsError] = useState('')

  const [paymentForm, setPaymentForm] = useState({
    method: 'violetv_pay',
    qr_payload: 'violetv_pay:violet-pay',
    display_value: 'VioletPay',
    reference_hint: 'Pay ref',
    is_active: true,

    bank_payee_name: '',
    bank_account_number: '',
    bank_ifsc_code: '',
    bank_qr_payload: '',

    upi_id: '',
    upi_qr_payload: '',
  })

  const loadPaymentConfigs = async () => {
    setPaymentConfigsLoading(true)
    setPaymentConfigsError('')
    try {
      const res = await fetch('/api/admin/payment-configs', {
        headers: authHeaders(),
        cache: 'no-store',
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to load payment configs')
      }
      const d = await res.json().catch(() => ({}))
      const map = {}
      ;(d.paymentConfigs || []).forEach((c) => {
        map[c.method] = c
      })
      setPaymentConfigs(map)

      const current = map['violetv_pay']
      if (current) {

        setPaymentForm({
          method: current.method,
          qr_payload: current.qr_payload,
          display_value: current.display_value,
          reference_hint: current.reference_hint,
          is_active: !!current.is_active,

          bank_payee_name: current.bank_payee_name || '',
          bank_account_number: current.bank_account_number || '',
          bank_ifsc_code: current.bank_ifsc_code || '',
          bank_qr_payload: current.bank_qr_payload || '',

          upi_id: current.upi_id || '',
          upi_qr_payload: current.upi_qr_payload || '',
        })
      }
    } catch (e) {
      setPaymentConfigsError(e.message)
    } finally {
      setPaymentConfigsLoading(false)
    }
  }

  useEffect(() => {
    if (tab === 'Payments') loadPaymentConfigs()
  }, [tab])

  const handleSavePaymentConfig = async () => {
    try {
      const body = {
        qr_payload: paymentForm.qr_payload,
        display_value: paymentForm.display_value,
        reference_hint: paymentForm.reference_hint,
        is_active: !!paymentForm.is_active,

        bank_payee_name: paymentForm.bank_payee_name,
        bank_account_number: paymentForm.bank_account_number,
        bank_ifsc_code: paymentForm.bank_ifsc_code,
        bank_qr_payload: paymentForm.bank_qr_payload,

        upi_id: paymentForm.upi_id,
        upi_qr_payload: paymentForm.upi_qr_payload,
      }
      const res = await fetch(`/api/admin/payment-configs/${encodeURIComponent(paymentForm.method)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify(body),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Failed to save payment config')
      await loadPaymentConfigs()
      alert('Payment config saved')
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex">

      {/* Sidebar */}
      <aside className="w-64 bg-dark-900/95 border-r border-white/5 p-5 hidden lg:flex flex-col">
        <Link to="/" className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div>
            <span className="text-lg font-display font-bold text-white">Admin</span>
            <div className="text-[10px] text-red-400 font-bold uppercase">Super Admin</div>
          </div>
        </Link>
        <nav className="flex-1 space-y-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === t ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
              {t}
            </button>
          ))}
        </nav>
        <Link to="/dashboard" className="px-4 py-2.5 rounded-xl text-sm text-white/30 hover:text-white hover:bg-white/5 transition-all text-center">← Back to Dashboard</Link>
      </aside>

      {/* Content */}
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        {/* Mobile tabs */}
        <div className="lg:hidden flex gap-1 overflow-x-auto pb-4 mb-4">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${tab === t ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white/40'}`}>{t}</button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl font-display font-bold text-white">{tab}</h1>
          <div className="flex items-center gap-2">
            {stats.fetchedAt && (
              <span className="text-[10px] text-white/25">
                Updated {new Date(stats.fetchedAt).toLocaleTimeString()}
              </span>
            )}
            <button
              type="button"
              onClick={fetchAllData}
              disabled={refreshing}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10 disabled:opacity-40"
            >
              {refreshing ? '↻ Refreshing…' : '↻ Refresh data'}
            </button>
          </div>
        </div>

        {/* OVERVIEW */}
        {tab === 'Overview' && (
          <div className="space-y-6">
            <p className="text-xs text-white/35 px-1">
              Deposits are credited after you approve them in <strong className="text-white/50">Approvals</strong>.
              &quot;Total Deposits&quot; counts completed deposits only; pending requests appear below.
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Users', value: stats.users, color: 'text-primary-400', icon: '👥' },
                { label: 'Platform Wallet Balance', value: formatUsd(stats.walletBalance), color: 'text-accent-400', icon: '💰' },
                { label: 'Total Deposits (completed)', value: formatUsd(stats.deposits), color: 'text-accent-400', icon: '💳' },
                { label: 'Pending Deposits', value: `${stats.pendingDepositsCount || 0} (${formatUsd(stats.pendingDepositVolume)})`, color: 'text-gold-400', icon: '📥' },
                { label: 'Pending Withdrawals', value: stats.pending, color: 'text-red-400', icon: '⏳' },
                { label: 'Active Tournaments', value: stats.active, color: 'text-primary-400', icon: '🏆' },
                { label: 'Total Prize Pools', value: formatUsd(stats.prize), color: 'text-gold-400', icon: '🏆' },
                { label: 'Total Trades', value: stats.trades, color: 'text-purple-400', icon: '📊' },
                { label: 'Total Bots', value: stats.bots, color: 'text-orange-400', icon: '🤖' },
                { label: 'All Tournaments', value: stats.tournaments, color: 'text-primary-400', icon: '🎯' },
              ].map(s => (
                <div key={s.label} className="glass-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-white/30">{s.label}</span>
                    <span className="text-xl">{s.icon}</span>
                  </div>
                  <div className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TOURNAMENTS */}
        {tab === 'Tournaments' && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display font-bold text-white">Create Tournament</h3>
                {/* Load saved template */}
                {localStorage.getItem('ta_template') && (
                  <button onClick={() => {
                    const tmpl = JSON.parse(localStorage.getItem('ta_template'))
                    setTourneyForm(tmpl.form)
                    setPrizes(tmpl.prizes)
                  }} className="text-xs px-3 py-1.5 rounded-lg bg-gold-500/10 text-gold-400 border border-gold-500/20 hover:bg-gold-500/20 transition-all">
                    📋 Load Saved Template
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Title</label>
                  <input value={tourneyForm.title} onChange={e => setTourneyForm({...tourneyForm, title: e.target.value})} className="glass-input" placeholder="Tournament Name"/>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Asset</label>
                  <select value={tourneyForm.asset} onChange={e => setTourneyForm({...tourneyForm, asset: e.target.value})} className="glass-input">
                    {['BTC/USD','ETH/USD','EUR/USD','GBP/USD','GOLD/USD','GBP/JPY'].map(a => <option key={a} value={a} className="bg-dark-900">{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Entry Fee ($)</label>
                  <input type="number" value={tourneyForm.entry_fee} onChange={e => setTourneyForm({...tourneyForm, entry_fee: +e.target.value})} className="glass-input"/>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Prize Pool ($)</label>
                  <input type="number" value={tourneyForm.prize_pool} onChange={e => setTourneyForm({...tourneyForm, prize_pool: +e.target.value})} className="glass-input"/>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Duration</label>
                  <select value={tourneyForm.duration} onChange={e => setTourneyForm({...tourneyForm, duration: +e.target.value})} className="glass-input">
                    {[15,30,60,120,240,360,720,1440,2880,4320,10080,43200].map(d => <option key={d} value={d} className="bg-dark-900">{d < 60 ? `${d}m` : d < 1440 ? `${d/60}h` : `${d/1440}d`}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Starting Balance</label>
                  <input type="number" value={tourneyForm.balance} onChange={e => setTourneyForm({...tourneyForm, balance: +e.target.value})} className="glass-input"/>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Max Players</label>
                  <input type="number" value={tourneyForm.max_players} onChange={e => setTourneyForm({...tourneyForm, max_players: +e.target.value})} className="glass-input"/>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Tier</label>
                  <select value={tourneyForm.tier} onChange={e => setTourneyForm({...tourneyForm, tier: e.target.value})} className="glass-input">
                    {['bronze','silver','gold','diamond','legendary'].map(t => <option key={t} value={t} className="bg-dark-900">{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Bot Difficulty</label>
                  <select value={tourneyForm.bot_difficulty} onChange={e => setTourneyForm({...tourneyForm, bot_difficulty: e.target.value})} className="glass-input">
                    {['low','medium','high','elite'].map(d => <option key={d} value={d} className="bg-dark-900">{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">🤖 Min Bots</label>
                  <input type="number" min="0" max="500" value={tourneyForm.bot_min} onChange={e => setTourneyForm({...tourneyForm, bot_min: +e.target.value})} className="glass-input" placeholder="0"/>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">🤖 Max Bots</label>
                  <input type="number" min="0" max="500" value={tourneyForm.bot_max} onChange={e => setTourneyForm({...tourneyForm, bot_max: +e.target.value})} className="glass-input" placeholder="0"/>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Start Date/Time</label>
                  <input type="datetime-local" value={tourneyForm.start_time || ''} onChange={e => setTourneyForm({...tourneyForm, start_time: e.target.value})} className="glass-input"/>
                  <p className="text-[10px] text-white/20 mt-1">Status auto-updates: Upcoming → Live → Finished based on time.</p>
                </div>
              </div>
              <p className="text-[10px] text-white/20 mt-2">🤖 Bots will auto-join between min and max count. Set both to 0 for no bots.</p>
            </div>

            {/* Dynamic Prize Distribution */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display font-bold text-white">🏆 Prize Distribution</h3>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${totalPct === 100 ? 'text-accent-400' : totalPct > 100 ? 'text-red-400' : 'text-gold-400'}`}>
                    {totalPct}% / 100%
                  </span>
                  {prizes.length < 10 && (
                    <button onClick={() => setPrizes([...prizes, { rank: prizes.length + 1, percentage: 0 }])} className="text-xs px-3 py-1.5 rounded-lg bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 transition-all font-bold">
                      + Add Place
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {prizes.map((p, i) => {
                  const amount = Math.round(tourneyForm.prize_pool * p.percentage / 100)
                  const RANK_STYLES = ['bg-gold-400 text-dark-950', 'bg-slate-300 text-dark-950', 'bg-orange-500 text-white']
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${RANK_STYLES[i] || 'bg-white/10 text-white/50'}`}>
                        #{p.rank}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <input
                            type="range" min="0" max="100" step="1"
                            value={p.percentage}
                            onChange={e => { const n = [...prizes]; n[i].percentage = +e.target.value; setPrizes(n) }}
                            className="flex-1 accent-primary-500 h-2"
                          />
                          <input
                            type="number" min="0" max="100"
                            value={p.percentage}
                            onChange={e => { const n = [...prizes]; n[i].percentage = Math.min(100, +e.target.value); setPrizes(n) }}
                            className="w-16 text-center text-sm font-mono font-bold glass-input !py-1.5 !px-2"
                          />
                          <span className="text-xs text-white/30 w-4">%</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${i < 3 ? 'bg-gold-400' : 'bg-primary-500'}`} style={{ width: `${p.percentage}%` }} />
                        </div>
                      </div>
                      <div className="text-sm font-mono font-bold text-gold-400 w-20 text-right">${amount}</div>
                      {prizes.length > 1 && (
                        <button onClick={() => setPrizes(prizes.filter((_, j) => j !== i).map((p, k) => ({ ...p, rank: k + 1 })))} className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center text-xs transition-all shrink-0">✕</button>
                      )}
                    </div>
                  )
                })}
              </div>

              {totalPct !== 100 && (
                <div className={`mt-3 text-xs font-bold px-3 py-2 rounded-lg ${totalPct > 100 ? 'bg-red-500/10 text-red-400' : 'bg-gold-500/10 text-gold-400'}`}>
                  {totalPct > 100 ? `⚠️ Over by ${totalPct - 100}% — reduce percentages` : `💡 ${100 - totalPct}% remaining — distribute to more places`}
                </div>
              )}

              {/* Quick presets */}
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="text-xs text-white/20 self-center mr-1">Presets:</span>
                <button onClick={() => setPrizes([{ rank: 1, percentage: 50 }, { rank: 2, percentage: 30 }, { rank: 3, percentage: 20 }])} className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all font-bold">Top 3</button>
                <button onClick={() => setPrizes([{ rank: 1, percentage: 40 }, { rank: 2, percentage: 25 }, { rank: 3, percentage: 15 }, { rank: 4, percentage: 10 }, { rank: 5, percentage: 10 }])} className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all font-bold">Top 5</button>
                <button onClick={() => setPrizes([{ rank: 1, percentage: 30 }, { rank: 2, percentage: 20 }, { rank: 3, percentage: 15 }, { rank: 4, percentage: 10 }, { rank: 5, percentage: 8 }, { rank: 6, percentage: 5 }, { rank: 7, percentage: 4 }, { rank: 8, percentage: 3 }, { rank: 9, percentage: 3 }, { rank: 10, percentage: 2 }])} className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all font-bold">Top 10</button>
                <button onClick={() => setPrizes([{ rank: 1, percentage: 100 }])} className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all font-bold">Winner Takes All</button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button disabled={totalPct !== 100 || !tourneyForm.title || creating} className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed" onClick={handleCreateTournament}>
                {creating ? '⏳ Creating...' : created ? '✅ Created!' : '🚀 Create Tournament'}
              </button>
              <button onClick={() => {
                localStorage.setItem('ta_template', JSON.stringify({ form: tourneyForm, prizes }))
                alert('✅ Saved as daily template!')
              }} className="px-6 py-3 rounded-xl font-bold text-sm bg-gold-500/10 text-gold-400 border border-gold-500/20 hover:bg-gold-500/20 transition-all">
                💾 Save as Daily Template
              </button>
              <label className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 cursor-pointer">
                <input type="checkbox" checked={tourneyForm.daily_repeat} onChange={e => setTourneyForm({...tourneyForm, daily_repeat: e.target.checked})} className="accent-primary-500 w-4 h-4"/>
                <span className="text-xs font-bold text-white/50">🔄 Auto-repeat daily</span>
              </label>
            </div>
            
            {/* EXISTING TOURNAMENTS LIST */}
            <div className="glass-card p-6 mt-6">
              <h3 className="text-lg font-display font-bold text-white mb-4">⚙️ Manage Tournaments</h3>
              {tournamentsList.length === 0 ? (
                <div className="text-center py-6 text-white/30 text-sm">No tournaments found</div>
              ) : (
                <div className="space-y-2">
                  {tournamentsList.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          {t.title}
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                            t.status === 'active' ? 'bg-accent-500/20 text-accent-400' :
                            t.status === 'completed' ? 'bg-white/10 text-white/30' :
                            'bg-primary-500/20 text-primary-400'
                          }`}>
                            {t.status === 'active' ? '🔴 Live' : t.status === 'completed' ? '🏁 Finished' : '⏰ Upcoming'}
                          </span>
                        </div>
                        <div className="text-xs text-white/40">{t.asset} • {t.current_players}/{t.max_players} Players • Prize: ${t.prize_pool}</div>
                      </div>
                      <button onClick={() => handleManageTournament(t.id)} className="btn-primary py-1.5 px-4 text-xs">
                        Manage
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* USERS */}
        {tab === 'Users' && (
          <div className="space-y-5">
            <div className="glass-card p-5">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[240px]">
                  <label className="text-xs text-white/40 mb-1 block">Search user</label>
                  <input
                    className="glass-input"
                    value={adminUserSearch}
                    onChange={(e) => setAdminUserSearch(e.target.value)}
                    placeholder="Type username, email, or user id…"
                  />
                </div>

                <button
                  onClick={handleAdminUserSearch}
                  className="btn-primary mt-auto"
                  disabled={adminUserSearch.trim().length === 0 || adminUserSearching}
                >
                  {adminUserSearching ? 'Searching…' : 'Search'}
                </button>

                {adminUserSearch.trim().length > 0 && (
                  <button
                    onClick={() => {
                      setAdminUserSearch('')
                      setUsers([])
                      setSelectedAdminUser(null)
                      setSelectedAdminUserOverview(null)
                    }}
                    className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-white/40 hover:text-white hover:bg-white/5 font-bold text-xs mt-auto"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="glass-card overflow-hidden">
              {users.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">👥</div>
                  <h3 className="text-lg font-display font-bold text-white mb-1">No users found</h3>
                  <p className="text-sm text-white/30">Use search above to find a user</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        {['Username','Email','Balance','Wins','Tournaments','Status','Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-bold text-white/30 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3 text-sm font-semibold text-white">
                            <button className="hover:underline" onClick={() => loadAdminUserOverview(u)}>
                              {u.username}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-sm text-white/40">{u.email}</td>
                          <td className="px-4 py-3 text-sm font-mono text-accent-400">${(u.real_balance || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-white/60">{u.win_count || 0}</td>
                          <td className="px-4 py-3 text-sm text-white/60">{u.total_tournaments || 0}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${u.role === 'banned' ? 'bg-red-500/20 text-red-400' : 'bg-accent-500/20 text-accent-400'}`}>{u.role}</span>
                          </td>
                          <td className="px-4 py-3 flex gap-2">
                            <button
                              className="text-xs px-2 py-1 rounded bg-primary-500/20 text-primary-400 hover:bg-primary-500/30"
                              onClick={() => {
                                const ok = window.confirm(`Set balance for ${u.username}?`)
                                if (!ok) return
                                const next = window.prompt('New balance (real_balance):', String(u.real_balance ?? 0))
                                if (next === null) return
                                const amt = parseFloat(next)
                                if (!Number.isFinite(amt)) {
                                  alert('Invalid number')
                                  return
                                }
                                fetch(`/api/admin/users/${u.id}/balance`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('tradearena_token')}`,
                                  },
                                  body: JSON.stringify({ amount: amt, type: 'set' }),
                                })
                                  .then(async (res) => {
                                    const d = await res.json().catch(() => ({}))
                                    if (!res.ok) throw new Error(d.error || 'Failed to update balance')
                                    fetchAllData()
                                  })
                                  .catch((e) => alert(e.message))
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                              onClick={() => {
                                fetch(`/api/admin/users/${u.id}/ban`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('tradearena_token')}`,
                                  },
                                  body: JSON.stringify({ banned: u.role !== 'banned' }),
                                })
                                  .then(async (res) => {
                                    const d = await res.json().catch(() => ({}))
                                    if (!res.ok) throw new Error(d.error || 'Failed to update user status')
                                    fetchAllData()
                                  })
                                  .catch((e) => alert(e.message))
                              }}
                            >
                              {u.role === 'banned' ? 'Unban' : 'Ban'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* User overview */}
            {selectedAdminUser && selectedAdminUserOverview && (
              <div className="glass-card p-5">
                <h3 className="text-sm font-bold text-white mb-3">User Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="text-xs text-white/40">Wallet Balance</div>
                    <div className="text-lg font-mono font-bold text-accent-400">${Number(selectedAdminUserOverview.user.real_balance || 0).toFixed(2)}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="text-xs text-white/40">Deposits (completed)</div>
                    <div className="text-lg font-mono font-bold text-primary-400">${Number(selectedAdminUserOverview.stats.depositsCompletedVolume || 0).toFixed(2)}</div>
                    <div className="text-[10px] text-white/25 mt-1">Pending: {selectedAdminUserOverview.stats.depositsPendingCount || 0} (${Number(selectedAdminUserOverview.stats.depositsPendingVolume || 0).toFixed(2)})</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="text-xs text-white/40">Withdrawals (completed)</div>
                    <div className="text-lg font-mono font-bold text-red-400">${Number(selectedAdminUserOverview.stats.withdrawalsCompletedVolume || 0).toFixed(2)}</div>
                    <div className="text-[10px] text-white/25 mt-1">Pending: {selectedAdminUserOverview.stats.withdrawalsPendingCount || 0}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="text-xs text-white/40">Trades</div>
                    <div className="text-lg font-mono font-bold text-gold-400">{selectedAdminUserOverview.stats.tradesCount || 0}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="text-xs text-white/40">Identity</div>
                    <div className="text-sm font-bold text-white">
                      {selectedAdminUser.username}
                      <span className={`text-[10px] ml-2 px-2 py-0.5 rounded uppercase ${selectedAdminUser.role === 'banned' ? 'bg-red-500/20 text-red-400' : 'bg-accent-500/20 text-accent-400'}`}>{selectedAdminUser.role}</span>
                    </div>
                    <div className="text-[10px] text-white/25 mt-1">{selectedAdminUser.email}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MARKET CONTROL */}
        {tab === 'Market' && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="text-lg font-display font-bold text-white mb-4">🎮 Market Mode</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { mode: 'bull', label: '🐂 Bull', desc: 'Prices trend up', color: 'accent' },
                  { mode: 'bear', label: '🐻 Bear', desc: 'Prices trend down', color: 'red' },
                  { mode: 'chaos', label: '🌪️ Chaos', desc: 'Wild swings', color: 'purple' },
                  { mode: 'balanced', label: '⚖️ Balanced', desc: 'Natural market', color: 'primary' },
                  { mode: 'manual', label: '🕹️ Manual', desc: 'Full control', color: 'gold' },
                ].map(m => (
                  <button key={m.mode} onClick={() => setMarketMode(m.mode)} className={`p-4 rounded-xl border text-center transition-all ${marketMode === m.mode ? `border-${m.color}-500/50 bg-${m.color}-500/10 shadow-[0_0_20px_rgba(59,142,255,0.1)]` : 'border-white/5 bg-white/[0.02] hover:bg-white/5'}`}>
                    <div className="text-2xl mb-1">{m.label.split(' ')[0]}</div>
                    <div className="text-xs font-bold text-white">{m.label.split(' ')[1]}</div>
                    <div className="text-[10px] text-white/30 mt-1">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="glass-card p-6">
              <h3 className="text-lg font-display font-bold text-white mb-4">📊 Volatility Control</h3>
              <input type="range" min="0.1" max="5" step="0.1" value={volatility} onChange={e => setVolatility(+e.target.value)} className="w-full accent-primary-500"/>
              <div className="flex justify-between text-xs text-white/30 mt-2">
                <span>Calm (0.1x)</span>
                <span className="text-primary-400 font-bold">{volatility}x</span>
                <span>Extreme (5x)</span>
              </div>
            </div>
          </div>
        )}

        {/* BOTS */}
        {tab === 'Bots' && (
          <div className="glass-card p-6">
            <h3 className="text-lg font-display font-bold text-white mb-4">🤖 Create Puppet Bot</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/40 mb-1 block">Bot Name</label>
                <input value={botForm.name} onChange={e => setBotForm({...botForm, name: e.target.value})} className="glass-input" placeholder="TradeMaster_X"/>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Country</label>
                <select value={botForm.country} onChange={e => setBotForm({...botForm, country: e.target.value})} className="glass-input">
                  {['🇺🇸','🇬🇧','🇯🇵','🇩🇪','🇫🇷','🇮🇳','🇧🇷','🇰🇷','🇦🇺','🇨🇦'].map(c => <option key={c} value={c} className="bg-dark-900">{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Difficulty</label>
                <select value={botForm.difficulty} onChange={e => setBotForm({...botForm, difficulty: e.target.value})} className="glass-input">
                  {['low','medium','high','elite'].map(d => <option key={d} value={d} className="bg-dark-900">{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Chat Personality</label>
                <select value={botForm.personality} onChange={e => setBotForm({...botForm, personality: e.target.value})} className="glass-input">
                  {['aggressive','fearful','expert','hype','toxic','silent'].map(p => <option key={p} value={p} className="bg-dark-900">{p}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleCreatePuppetBot} disabled={!botForm.name.trim() || creatingBot} className="btn-primary mt-4 disabled:opacity-50">
              {creatingBot ? 'Creating...' : 'Create Bot'}
            </button>
          </div>
        )}

        {/* PAYMENTS CONFIG */}
        {tab === 'Payments' && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="text-lg font-display font-bold text-white mb-2">🧾 Payment QR / Reference Config</h3>
              <p className="text-xs text-white/30">Admin can manually update payment payloads used on the Wallet Deposit screen. Users will see this automatically.</p>
              {paymentConfigsError && (
                <div className="mt-3 text-xs font-bold text-red-400">{paymentConfigsError}</div>
              )}

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Method</label>
                  <select
                    value={paymentForm.method}
                    onChange={(e) => {
                      const method = e.target.value
                      const c = paymentConfigs[method]
                      if (!c) {
                        setPaymentForm({ ...paymentForm, method })
                        return
                      }
                      setPaymentForm({
                        method: c.method,
                        qr_payload: c.qr_payload || '',
                        display_value: c.display_value || '',
                        reference_hint: c.reference_hint || '',
                        is_active: !!c.is_active,
                        bank_payee_name: c.bank_payee_name || '',
                        bank_account_number: c.bank_account_number || '',
                        bank_ifsc_code: c.bank_ifsc_code || '',
                        bank_qr_payload: c.bank_qr_payload || '',
                        upi_id: c.upi_id || '',
                        upi_qr_payload: c.upi_qr_payload || '',
                      })
                    }}
                    className="glass-input"
                  >
                    {Object.values(paymentConfigs).map((c) => (
                      <option key={c.method} value={c.method} className="bg-dark-900">
                        {c.method}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-white/40 mb-1 block">Status</label>
                  <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 cursor-pointer w-fit">
                    <input
                      type="checkbox"
                      checked={paymentForm.is_active}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, is_active: e.target.checked }))}
                      className="accent-primary-500 w-4 h-4"
                    />
                    <span className="text-xs font-bold text-white/60">Active</span>
                  </label>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">QR Payload / Payment String</label>
                  <textarea
                    value={paymentForm.qr_payload}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, qr_payload: e.target.value }))}
                    className="glass-input min-h-[90px]"
                    placeholder="e.g. violetv_pay:some-value or crypto:address"
                  />
                </div>

                {paymentForm.method === 'bank' && (
                  <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <h4 className="text-xs font-bold text-white/60 mb-3">Bank Payee Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-white/40 mb-1 block">Payee Name</label>
                        <input
                          value={paymentForm.bank_payee_name || ''}
                          onChange={(e) => setPaymentForm((p) => ({ ...p, bank_payee_name: e.target.value }))}
                          className="glass-input"
                          placeholder="Account holder / payee name"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-white/40 mb-1 block">Account Number</label>
                        <input
                          value={paymentForm.bank_account_number || ''}
                          onChange={(e) => setPaymentForm((p) => ({ ...p, bank_account_number: e.target.value }))}
                          className="glass-input font-mono"
                          placeholder="Bank account number"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-white/40 mb-1 block">IFSC Code</label>
                        <input
                          value={paymentForm.bank_ifsc_code || ''}
                          onChange={(e) => setPaymentForm((p) => ({ ...p, bank_ifsc_code: e.target.value }))}
                          className="glass-input font-mono"
                          placeholder="IFSC"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-white/40 mb-1 block">Bank QR Payload (optional)</label>
                        <textarea
                          value={paymentForm.bank_qr_payload || ''}
                          onChange={(e) => setPaymentForm((p) => ({ ...p, bank_qr_payload: e.target.value }))}
                          className="glass-input min-h-[70px]"
                          placeholder="If you want to show a QR payload reference"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {paymentForm.method === 'upi' && (
                  <div className="mt-4 p-4 rounded-xl bg-primary-500/[0.04] border border-primary-500/20">
                    <h4 className="text-xs font-bold text-primary-400 mb-3 flex items-center gap-1.5">
                      <span>📱</span> UPI / Scanner Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-white/40 mb-1 block">UPI ID</label>
                        <input
                          value={paymentForm.upi_id || ''}
                          onChange={(e) => setPaymentForm((p) => ({ ...p, upi_id: e.target.value }))}
                          className="glass-input font-mono"
                          placeholder="yourname@upi or yourname@paytm"
                        />
                        <p className="text-[10px] text-white/25 mt-1">Shown to users on the deposit screen (GPay, PhonePe, Paytm)</p>
                      </div>
                      <div>
                        <label className="text-xs text-white/40 mb-1 block">UPI QR Payload / Deep-link (for scanner)</label>
                        <input
                          value={paymentForm.upi_qr_payload || ''}
                          onChange={(e) => setPaymentForm((p) => ({ ...p, upi_qr_payload: e.target.value }))}
                          className="glass-input font-mono"
                          placeholder="upi://pay?pa=yourname@upi&pn=TradArena"
                        />
                        <p className="text-[10px] text-white/25 mt-1">Optional deep-link string encoded into the QR shown to users. Leave empty to use UPI ID.</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Display Value</label>
                    <input
                      value={paymentForm.display_value}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, display_value: e.target.value }))}
                      className="glass-input"
                      placeholder="What users see as address/id"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Reference Hint</label>
                    <input
                      value={paymentForm.reference_hint}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, reference_hint: e.target.value }))}
                      className="glass-input"
                      placeholder="What users should paste as Pay ref / TxID"
                    />
                  </div>
                </div>

              </div>

              <div className="mt-5 flex flex-wrap gap-3 items-center">
                <button
                  disabled={paymentConfigsLoading}
                  onClick={handleSavePaymentConfig}
                  className="btn-primary disabled:opacity-40"
                >
                  {paymentConfigsLoading ? 'Saving…' : 'Save Config'}
                </button>

                <div className="text-xs text-white/25">
                  Method used by WalletPage: <span className="text-white/40 font-mono">{paymentForm.method}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* APPROVALS */}
        {tab === 'Approvals' && (
          <div className="glass-card overflow-hidden">

            {pendingTx.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">✅</div>
                <h3 className="text-lg font-display font-bold text-white mb-1">No pending approvals</h3>
                <p className="text-sm text-white/30">All deposit and withdrawal requests have been processed</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['User','Type','Amount','Method','Ref/TxID','Date','Status','Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-white/30 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingTx.map(w => (
                      <tr key={w.id} className="border-b border-white/[0.03]">
                        <td className="px-4 py-3 text-sm font-semibold text-white">{w.username || w.user_id}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${w.type === 'deposit' ? 'bg-accent-500/20 text-accent-400' : 'bg-red-500/20 text-red-400'}`}>
                            {w.type}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-sm font-mono font-bold ${w.type === 'deposit' ? 'text-accent-400' : 'text-red-400'}`}>
                          {w.type === 'deposit' ? '+' : '-'}${Math.abs(w.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-white/40">{w.method || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm font-mono text-white/40">{w.reference || '—'}</td>
                        <td className="px-4 py-3 text-sm text-white/40">{w.created_at?.split('T')[0] || 'N/A'}</td>
                        <td className="px-4 py-3"><span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gold-500/20 text-gold-400 uppercase">{w.status}</span></td>
                        <td className="px-4 py-3 flex gap-2">
                          <button onClick={() => handleTransactionAction(w.id, 'approve')} className="text-xs px-3 py-1 rounded bg-accent-500/20 text-accent-400 hover:bg-accent-500/30 font-bold">✓ Approve</button>
                          <button onClick={() => handleTransactionAction(w.id, 'reject')} className="text-xs px-3 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 font-bold">✗ Reject</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Manage Tournament Modal */}
      {managingTourney && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-4xl max-h-[90vh] flex flex-col bg-dark-900 border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                ⚙️ Manage {managingTourney.tournament.title}
                <span className={`text-[10px] px-2 py-0.5 rounded uppercase ${managingTourney.tournament.status === 'active' ? 'bg-accent-500/20 text-accent-400' : 'bg-primary-500/20 text-primary-400'}`}>{managingTourney.tournament.status}</span>
              </h2>
              <button onClick={() => setManagingTourney(null)} className="text-white/40 hover:text-white transition-colors">✕</button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-6">
              {/* Add Manual Bot Form */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <h3 className="text-sm font-bold text-white mb-3">Add Manual Player</h3>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs text-white/40 mb-1 block">Bot Name</label>
                    <input value={manualBotName} onChange={e => setManualBotName(e.target.value)} className="glass-input" placeholder="e.g. WhaleBot_X" />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs text-white/40 mb-1 block">Starting Balance</label>
                    <input type="number" value={manualBotBalance} onChange={e => setManualBotBalance(e.target.value)} className="glass-input" placeholder="10000" />
                  </div>
                  <button onClick={handleAddManualBot} disabled={!manualBotName || !manualBotBalance} className="btn-primary py-2 px-6 disabled:opacity-50 h-[42px] mt-auto">Add Bot</button>
                </div>
              </div>

              {/* Bulk Inject Genuine-Looking Bots */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <h3 className="text-sm font-bold text-white mb-3">👥 Bulk Inject Players (Realistic Names)</h3>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[120px]">
                    <label className="text-xs text-white/40 mb-1 block">Count</label>
                    <input type="number" value={injectCount} onChange={e => setInjectCount(e.target.value)} className="glass-input" placeholder="10" />
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="text-xs text-white/40 mb-1 block">Min Balance</label>
                    <input type="number" value={injectMin} onChange={e => setInjectMin(e.target.value)} className="glass-input" placeholder="1000" />
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="text-xs text-white/40 mb-1 block">Max Balance</label>
                    <input type="number" value={injectMax} onChange={e => setInjectMax(e.target.value)} className="glass-input" placeholder="10000" />
                  </div>
                  <button onClick={handleInjectBots} disabled={!Number.isFinite(parseInt(injectCount)) || parseInt(injectCount) <= 0 || injecting} className="btn-primary py-2 px-6 disabled:opacity-50 h-[42px] mt-auto">
                    {injecting ? 'Injecting...' : 'Inject Players'}
                  </button>
                </div>
              </div>

              {/* Leaderboard & Force Rank */}
              <div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h3 className="text-sm font-bold text-white">🏆 Leaderboard & Force Balance</h3>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!managingTourney?.tournament?.id) return
                      const ok = window.confirm(`Delete tournament "${managingTourney.tournament.title}"? This will mark it as completed and stop it from being active.`)
                      if (!ok) return
                      try {
                        const res = await fetch(`/api/admin/tournaments/${managingTourney.tournament.id}/delete`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('tradearena_token')}`
                          },
                            body: JSON.stringify({ force: false }),
                        })
                        const data = await res.json().catch(() => ({}))
                        if (!res.ok) {
                          const msg = data?.error || data?.message || `Failed to delete tournament (HTTP ${res.status})`
                          throw new Error(msg)
                        }
                        setManagingTourney(null)
                        await fetchAllData()
                      } catch (err) {
                        alert(err.message)
                      }
                    }}
                    className="text-xs px-3 py-2 rounded-xl bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 font-bold"
                  >
                    Delete
                  </button>
                </div>

                <div className="overflow-x-auto border border-white/5 rounded-xl">
                  <table className="w-full text-left">
                    <thead className="bg-white/5 border-b border-white/5">
                      <tr>
                        <th className="px-4 py-3 text-xs font-bold text-white/40">Rank</th>
                        <th className="px-4 py-3 text-xs font-bold text-white/40">Player</th>
                        <th className="px-4 py-3 text-xs font-bold text-white/40">Balance</th>
                        <th className="px-4 py-3 text-xs font-bold text-white/40 text-right">Force Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(managingTourney.leaderboard || []).map((p, i) => (
                        <tr key={p.user_id} className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-sm font-bold text-white/60">#{i + 1}</td>
                          <td className="px-4 py-3 text-sm text-white">
                            <span className="mr-2">{p.country || '🌍'}</span>
                            {p.username || 'Unknown'}
                          </td>
                          <td className="px-4 py-3 text-sm font-mono text-gold-400">${Number(p.balance).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <input 
                                type="number" 
                                value={forceBalances[p.user_id] || ''} 
                                onChange={e => setForceBalances(prev => ({...prev, [p.user_id]: e.target.value}))} 
                                className="glass-input !w-24 !py-1 !px-2 text-xs font-mono" 
                                placeholder={Number(p.balance).toFixed(0)} 
                              />
                              <button 
                                onClick={() => handleForceRank(p.user_id)} 
                                disabled={!forceBalances[p.user_id]} 
                                className="text-xs px-3 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 font-bold disabled:opacity-30"
                              >
                                Set
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {(!managingTourney.leaderboard || managingTourney.leaderboard.length === 0) && (
                        <tr><td colSpan="4" className="text-center py-6 text-white/40 text-sm">No participants yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
