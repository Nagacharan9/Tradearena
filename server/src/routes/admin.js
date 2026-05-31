import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { authenticateToken, isAdmin } from '../middleware/auth.js'
import { setMarketMode, setVolatility, setTrendDirection } from '../services/marketEngine.js'

const router = Router()

// All admin routes require auth + admin role
router.use(authenticateToken, isAdmin)

const BOT_COUNTRIES = [
  '\u{1F1FA}\u{1F1F8}', '\u{1F1EC}\u{1F1E7}', '\u{1F1E8}\u{1F1E6}',
  '\u{1F1E6}\u{1F1FA}', '\u{1F1E9}\u{1F1EA}', '\u{1F1EB}\u{1F1F7}',
  '\u{1F1EF}\u{1F1F5}', '\u{1F1E7}\u{1F1F7}', '\u{1F1EE}\u{1F1F3}',
  '\u{1F1FF}\u{1F1E6}',
]

function randomBotCountry() {
  return BOT_COUNTRIES[Math.floor(Math.random() * BOT_COUNTRIES.length)]
}

function uniqueBotName(db, rawName) {
  const base = String(rawName || '').trim().replace(/\s+/g, '_').slice(0, 40)
  if (!base) return ''

  let name = base
  while (db.prepare('SELECT id FROM users WHERE username = ?').get(name)) {
    name = `${base}${Math.floor(Math.random() * 10000)}`
  }
  return name
}

function createBotIdentity(db, {
  id = uuid(),
  name,
  country = randomBotCountry(),
  difficulty = 'high',
  aggression = 0.8,
  winRatio = 0.6,
  chatPersonality = 'aggressive',
}) {
  db.prepare(`
    INSERT INTO bots (id, name, country, difficulty, aggression, win_ratio, chat_personality, is_puppet)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(id, name, country, difficulty, aggression, winRatio, chatPersonality)

  db.prepare(`
    INSERT INTO users (id, username, email, password, country, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name, `bot_${id}@ta.local`, 'bot', country, 'bot')

  db.prepare(`
    INSERT OR IGNORE INTO wallets (id, user_id)
    VALUES (?, ?)
  `).run(uuid(), id)

  return { id, name, country }
}

// Dashboard stats
router.get('/stats', (req, res) => {
  const db = req.db
  const users = db.prepare('SELECT COUNT(*) as c FROM users WHERE role != ?').get('bot')
  const bots = db.prepare('SELECT COUNT(*) as c FROM users WHERE role = ?').get('bot')
  const tournaments = db.prepare('SELECT COUNT(*) as c FROM tournaments').get()
  const activeTournaments = db.prepare("SELECT COUNT(*) as c FROM tournaments WHERE status = 'active'").get()
  const totalPrize = db.prepare('SELECT COALESCE(SUM(prize_pool),0) as t FROM tournaments').get()
  const totalDeposits = db.prepare(`
    SELECT COALESCE(SUM(ABS(amount)), 0) as t FROM transactions
    WHERE type = 'deposit' AND status = 'completed'
  `).get()
  const pendingDeposits = db.prepare(`
    SELECT COUNT(*) as c, COALESCE(SUM(ABS(amount)), 0) as volume
    FROM transactions WHERE type = 'deposit' AND status = 'pending'
  `).get()
  const pendingWithdrawals = db.prepare(`
    SELECT COUNT(*) as c FROM transactions WHERE type = 'withdrawal' AND status = 'pending'
  `).get()
  const totalWalletBalance = db.prepare(`
    SELECT COALESCE(SUM(real_balance), 0) as t FROM wallets
  `).get()
  const totalTrades = db.prepare('SELECT COUNT(*) as c FROM trades').get()

  res.json({
    totalUsers: users.c,
    totalBots: bots.c,
    totalTournaments: tournaments.c,
    activeTournaments: activeTournaments.c,
    totalPrizePool: totalPrize.t,
    totalDeposits: totalDeposits.t,
    pendingDeposits: pendingDeposits.c,
    pendingDepositVolume: pendingDeposits.volume,
    pendingWithdrawals: pendingWithdrawals.c,
    totalWalletBalance: totalWalletBalance.t,
    totalTrades: totalTrades.c,
    users: users.c,
    bots: bots.c,
    tournaments: tournaments.c,
    active: activeTournaments.c,
    prize: totalPrize.t,
    deposits: totalDeposits.t,
    pending: pendingWithdrawals.c,
    pendingDepositsCount: pendingDeposits.c,
    walletBalance: totalWalletBalance.t,
    trades: totalTrades.c,
    fetchedAt: Date.now(),
  })
})

// Get all users
router.get('/users', (req, res) => {
  const db = req.db
  const users = db.prepare(`
    SELECT u.id, u.username, u.email, u.role, u.country, u.bonus_balance, u.rank_level,
      u.win_count, u.loss_count, u.total_tournaments, u.created_at,
      COALESCE(w.real_balance, u.real_balance, 0) as real_balance
    FROM users u
    LEFT JOIN wallets w ON w.user_id = u.id
    WHERE u.role != 'bot'
    ORDER BY u.created_at DESC
  `).all()
  res.json({ users, total: users.length })
})

// Update user balance
router.post('/users/:id/balance', (req, res) => {
  const db = req.db
  const { amount, type } = req.body // type: 'add' or 'set'
  if (type === 'set') {
    db.prepare('UPDATE wallets SET real_balance = ? WHERE user_id = ?').run(amount, req.params.id)
    db.prepare('UPDATE users SET real_balance = ? WHERE id = ?').run(amount, req.params.id)
  } else {
    db.prepare('UPDATE wallets SET real_balance = real_balance + ? WHERE user_id = ?').run(amount, req.params.id)
    db.prepare('UPDATE users SET real_balance = real_balance + ? WHERE id = ?').run(amount, req.params.id)
  }
  res.json({ success: true })
})

// Ban/unban user
router.post('/users/:id/ban', (req, res) => {
  const db = req.db
  const { banned } = req.body
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(banned ? 'banned' : 'user', req.params.id)
  res.json({ success: true })
})

// Search users (admin)
router.get('/users/search', (req, res) => {
  const db = req.db
  const q = String(req.query.q || '').trim()

  if (!q) return res.json({ users: [] })

  const pattern = `%${q.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`
  const users = db.prepare(`
    SELECT u.id, u.username, u.email, u.role, u.country,
      COALESCE(w.real_balance, u.real_balance, 0) as real_balance
    FROM users u
    LEFT JOIN wallets w ON w.user_id = u.id
    WHERE u.role != 'bot'
      AND (u.username LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\' OR u.id LIKE ? ESCAPE '\\')
    ORDER BY u.created_at DESC
    LIMIT 20
  `).all(pattern, pattern, pattern)

  res.json({ users })
})

// User overview (admin)
router.get('/users/:id/overview', (req, res) => {
  const db = req.db
  const userId = req.params.id

  const user = db.prepare(`
    SELECT u.id, u.username, u.email, u.role, u.country,
      COALESCE(w.real_balance, u.real_balance, 0) as real_balance
    FROM users u
    LEFT JOIN wallets w ON w.user_id = u.id
    WHERE u.id = ?
  `).get(userId)

  if (!user) return res.status(404).json({ error: 'User not found' })

  const deposits = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'completed' THEN ABS(amount) ELSE 0 END) as completed_volume,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
      SUM(CASE WHEN status = 'pending' THEN ABS(amount) ELSE 0 END) as pending_volume
    FROM transactions
    WHERE user_id = ? AND type = 'deposit'
  `).get(userId)

  const withdrawals = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'completed' THEN ABS(amount) ELSE 0 END) as completed_volume,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count
    FROM transactions
    WHERE user_id = ? AND type = 'withdrawal'
  `).get(userId)

  const trades = db.prepare(`
    SELECT COUNT(*) as count
    FROM trades
    WHERE user_id = ?
  `).get(userId)

  res.json({
    user,
    stats: {
      depositsCompletedVolume: deposits?.completed_volume ?? 0,
      depositsPendingCount: deposits?.pending_count ?? 0,
      depositsPendingVolume: deposits?.pending_volume ?? 0,
      withdrawalsCompletedVolume: withdrawals?.completed_volume ?? 0,
      withdrawalsPendingCount: withdrawals?.pending_count ?? 0,
      tradesCount: trades?.count ?? 0,
    },
  })
})

// Get all transactions (deposits/withdrawals)
router.get('/transactions', (req, res) => {
  const db = req.db
  const txns = db.prepare(`
    SELECT t.*, u.username, u.email FROM transactions t
    JOIN users u ON t.user_id = u.id
    ORDER BY t.created_at DESC LIMIT 200
  `).all()
  res.json({ transactions: txns })
})


// Approve/reject transaction
router.post('/transactions/:id/action', (req, res) => {
  const db = req.db
  const { action } = req.body // 'approve' or 'reject'
  const txn = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id)
  if (!txn) return res.status(404).json({ error: 'Transaction not found' })
  if (txn.status !== 'pending') return res.status(400).json({ error: 'Transaction already processed' })

  if (action === 'approve') {
    const approved = db.prepare(`
      UPDATE transactions SET status = 'completed' WHERE id = ? AND status = 'pending'
    `).run(req.params.id)
    if (approved.changes !== 1) {
      return res.status(400).json({ error: 'Transaction already processed' })
    }
    if (txn.type === 'deposit') {
      const amount = Math.abs(txn.amount)
      db.prepare('UPDATE wallets SET real_balance = real_balance + ?, total_deposited = total_deposited + ? WHERE user_id = ?')
        .run(amount, amount, txn.user_id)
      db.prepare('UPDATE users SET real_balance = real_balance + ? WHERE id = ?')
        .run(amount, txn.user_id)

      // Referral Reward Logic
      const previousDepositsCount = db.prepare(`
        SELECT COUNT(*) as count FROM transactions 
        WHERE user_id = ? AND type = 'deposit' AND status = 'completed' AND id != ?
      `).get(txn.user_id, txn.id)?.count || 0;

      if (previousDepositsCount === 0) {
        const referral = db.prepare(`
          SELECT id, referrer_id FROM referrals WHERE referred_id = ? AND reward_paid = 0
        `).get(txn.user_id);

        if (referral) {
          const successfulRefs = db.prepare(`
            SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ? AND reward_paid = 1
          `).get(referral.referrer_id)?.count || 0;

          const reward = successfulRefs >= 25 ? 2 : 1;

          db.prepare('UPDATE wallets SET real_balance = real_balance + ? WHERE user_id = ?')
            .run(reward, referral.referrer_id);
          db.prepare('UPDATE users SET real_balance = real_balance + ? WHERE id = ?')
            .run(reward, referral.referrer_id);

          db.prepare("UPDATE referrals SET reward_paid = 1, status = 'completed' WHERE id = ?")
            .run(referral.id);

          const rewardTxnId = uuid();
          db.prepare(`
            INSERT INTO transactions (id, user_id, type, amount, status, method, reference)
            VALUES (?, ?, 'referral_reward', ?, 'completed', 'system', ?)
          `).run(rewardTxnId, referral.referrer_id, reward, 'Referral reward for first deposit');
        }
      }
    } else if (txn.type === 'withdrawal') {
      const amount = Math.abs(txn.amount)
      db.prepare('UPDATE wallets SET total_withdrawn = total_withdrawn + ? WHERE user_id = ?')
        .run(amount, txn.user_id)
    }
  } else {
    const rejected = db.prepare(`
      UPDATE transactions SET status = 'rejected' WHERE id = ? AND status = 'pending'
    `).run(req.params.id)
    if (rejected.changes !== 1) {
      return res.status(400).json({ error: 'Transaction already processed' })
    }
    if (txn.type === 'withdrawal') {
      const amount = Math.abs(txn.amount)
      db.prepare('UPDATE wallets SET real_balance = real_balance + ? WHERE user_id = ?')
        .run(amount, txn.user_id)
      db.prepare('UPDATE users SET real_balance = real_balance + ? WHERE id = ?')
        .run(amount, txn.user_id)
    }
  }

  const wallet = db.prepare('SELECT real_balance FROM wallets WHERE user_id = ?').get(txn.user_id)
  res.json({
    success: true,
    transactionId: txn.id,
    type: txn.type,
    action,
    userBalance: wallet?.real_balance ?? 0,
  })
})

// Market manipulation
router.post('/market/mode', (req, res) => {
  const { mode } = req.body
  setMarketMode(mode)
  res.json({ success: true, mode })
})

router.post('/market/volatility', (req, res) => {
  const { multiplier } = req.body
  setVolatility(multiplier)
  res.json({ success: true, multiplier })
})

router.post('/market/trend', (req, res) => {
  const { direction } = req.body
  setTrendDirection(direction)
  res.json({ success: true, direction })
})

// Tournament management
router.post('/tournaments/:id/status', (req, res) => {
  const db = req.db
  const { status } = req.body
  db.prepare('UPDATE tournaments SET status = ? WHERE id = ?').run(status, req.params.id)
  res.json({ success: true })
})

// Delete tournament (admin)
// Soft-delete: mark completed so it is no longer considered active.
router.post('/tournaments/:id/delete', (req, res) => {
  const db = req.db
  const { force } = req.body || {}
  const tournamentId = req.params.id

  try {
    const tournament = db.prepare('SELECT id, status FROM tournaments WHERE id = ?').get(tournamentId)
    if (!tournament) return res.status(404).json({ error: 'Tournament not found', tournamentId })

    // Always soft-delete.
    db.prepare(`
      UPDATE tournaments
      SET status = 'completed'
      WHERE id = ?
    `).run(tournamentId)

    // Optional hard-delete of historical data.
    // Wrap in a transaction to avoid partial deletes causing “delete failed” symptoms.
    if (force) {
      db.prepare('BEGIN').run()
      db.prepare(`DELETE FROM tournament_participants WHERE tournament_id = ?`).run(tournamentId)
      db.prepare(`DELETE FROM trades WHERE tournament_id = ?`).run(tournamentId)
      db.prepare(`DELETE FROM chat_messages WHERE tournament_id = ?`).run(tournamentId)
      db.prepare('COMMIT').run()
    }

    return res.json({ success: true, deleted: true, forced: !!force, tournamentId })
  } catch (err) {
    // Best-effort rollback for transaction failures.
    try { db.prepare('ROLLBACK').run() } catch (_) {}
    console.error('delete tournament error:', err)
    return res.status(500).json({
      error: err?.message || 'Failed to delete tournament',
      tournamentId: req.params.id,
      forced: !!force,
    })
  }
})

// Force rank change
router.post('/tournaments/:id/force-rank', (req, res) => {
  const db = req.db
  const { userId, newBalance } = req.body
  db.prepare('UPDATE tournament_participants SET balance = ? WHERE tournament_id = ? AND user_id = ?')
    .run(newBalance, req.params.id, userId)
  res.json({ success: true })
})

// Add manual bot to tournament
router.post('/tournaments/:id/add-bot', (req, res) => {
  const db = req.db
  const { balance } = req.body
  const parsedBalance = Number.parseFloat(balance)
  const name = uniqueBotName(db, req.body.name)

  if (!name) return res.status(400).json({ error: 'Bot name is required' })
  if (!Number.isFinite(parsedBalance) || parsedBalance < 0) {
    return res.status(400).json({ error: 'Starting balance must be a valid number' })
  }

  const tournament = db.prepare('SELECT id, current_players, max_players FROM tournaments WHERE id = ?').get(req.params.id)
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' })
  if ((tournament.current_players || 0) >= (tournament.max_players || 0)) {
    return res.status(400).json({ error: 'Tournament is full' })
  }
  
  try {
    db.prepare('BEGIN').run()
    const bot = createBotIdentity(db, { name })

    // 2. Add to tournament
    db.prepare(`INSERT INTO tournament_participants (id, tournament_id, user_id, balance, is_bot) VALUES (?, ?, ?, ?, 1)`)
      .run(uuid(), req.params.id, bot.id, parsedBalance)
      
    // 3. Increment players
    db.prepare('UPDATE tournaments SET current_players = current_players + 1 WHERE id = ?')
      .run(req.params.id)
      
    db.prepare('COMMIT').run()
    
    res.json({ success: true, botId: bot.id, name: bot.name })
  } catch (err) {
    console.error('add-bot error:', err)
    try { db.prepare('ROLLBACK').run() } catch (_) {}
    res.status(500).json({ error: err.message })
  }
})

// Bulk inject bots into tournament
router.post('/tournaments/:id/inject-bots', (req, res) => {
  const db = req.db
  const { count, minBalance, maxBalance } = req.body
  const parsedCount = Number.parseInt(count, 10)
  const numCount = Math.min(500, Number.isFinite(parsedCount) ? parsedCount : 10)
  const rawMin = Number.parseFloat(minBalance)
  const rawMax = Number.parseFloat(maxBalance)
  const min = Number.isFinite(rawMin) ? rawMin : 1000
  const max = Number.isFinite(rawMax) ? rawMax : 10000

  if (numCount <= 0) return res.status(400).json({ error: 'Bot count must be greater than zero' })
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min) {
    return res.status(400).json({ error: 'Balance range is invalid' })
  }

  const tournament = db.prepare('SELECT id, current_players, max_players FROM tournaments WHERE id = ?').get(req.params.id)
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' })

  const openSlots = Math.max(0, (tournament.max_players || 0) - (tournament.current_players || 0))
  if (openSlots <= 0) return res.status(400).json({ error: 'Tournament is full' })
  const requestedCount = Math.min(numCount, openSlots)

  const realisticFirstNames = ['michael', 'emily', 'chris', 'sarah', 'joshua', 'jessica', 'matthew', 'ashley', 'david', 'amanda', 'james', 'brittany', 'john', 'megan', 'robert', 'samantha', 'joseph', 'taylor', 'daniel', 'lauren', 'william', 'stephanie', 'alexander', 'nicole', 'richard', 'elizabeth']
  const realisticLastNames = ['smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller', 'davis', 'rodriguez', 'martinez']
  const countries = BOT_COUNTRIES

  try {
    db.prepare('BEGIN').run()
    let injected = 0
    for (let i = 0; i < requestedCount; i++) {
      const id = uuid()
      
      const firstName = realisticFirstNames[Math.floor(Math.random() * realisticFirstNames.length)]
      const lastName = realisticLastNames[Math.floor(Math.random() * realisticLastNames.length)]
      const useNumber = Math.random() > 0.5
      const num = useNumber ? Math.floor(Math.random() * 999) : ''
      let baseName = `${firstName}${useNumber ? '_' : ''}${num || (Math.random() > 0.5 ? lastName.charAt(0) : '')}`
      
      // Ensure uniqueness
      let name = baseName
      while (db.prepare('SELECT id FROM users WHERE username = ?').get(name)) {
        name = `${baseName}${Math.floor(Math.random() * 10000)}`
      }

      const balance = min + Math.random() * (max - min)
      const country = countries[Math.floor(Math.random() * countries.length)]

      // 1. Create puppet bot in DB
      db.prepare(`INSERT INTO bots (id, name, country, difficulty, aggression, win_ratio, chat_personality, is_puppet) VALUES (?,?,?,?,?,?,?,1)`)
        .run(id, name, country, 'high', 0.8, 0.6, 'aggressive')
      db.prepare(`INSERT INTO users (id, username, email, password, country, role) VALUES (?,?,?,?,?,?)`)
        .run(id, name, `bot_${id}@ta.local`, 'bot', country, 'bot')
      db.prepare(`INSERT OR IGNORE INTO wallets (id, user_id) VALUES (?, ?)`)
        .run(uuid(), id)
        
      // 2. Add to tournament
      db.prepare(`INSERT INTO tournament_participants (id, tournament_id, user_id, balance, is_bot) VALUES (?, ?, ?, ?, 1)`)
        .run(uuid(), req.params.id, id, balance)
        
      injected++
    }
    
    // 3. Increment players
    db.prepare('UPDATE tournaments SET current_players = current_players + ? WHERE id = ?')
      .run(injected, req.params.id)
      
    db.prepare('COMMIT').run()
    
    res.json({ success: true, count: injected })
  } catch (err) {
    console.error('inject-bots error:', err)
    try { db.prepare('ROLLBACK').run() } catch (_) {}
    res.status(500).json({ error: err.message })
  }
})


// Create puppet bot
router.post('/bots/puppet', (req, res) => {
  const db = req.db
  const { name, country, difficulty, aggression, winRatio, chatPersonality, personality } = req.body
  const id = uuid()
  const botName = uniqueBotName(db, name)
  if (!botName) return res.status(400).json({ error: 'Bot name is required' })
  const selectedCountry = country || randomBotCountry()
  try {
    db.prepare('BEGIN').run()
    db.prepare(`INSERT INTO bots (id, name, country, difficulty, aggression, win_ratio, chat_personality, is_puppet) VALUES (?,?,?,?,?,?,?,1)`)
      .run(id, botName, selectedCountry, difficulty || 'high', aggression || 0.7, winRatio || 0.6, chatPersonality || personality || 'aggressive')
    db.prepare(`INSERT INTO users (id, username, email, password, country, role) VALUES (?,?,?,?,?,?)`)
      .run(id, botName, `bot_${id}@ta.local`, 'bot', selectedCountry, 'bot')
    db.prepare(`INSERT OR IGNORE INTO wallets (id, user_id) VALUES (?, ?)`)
      .run(uuid(), id)
    db.prepare('COMMIT').run()
    res.json({ success: true, botId: id, name: botName })
  } catch (err) {
    console.error('create-puppet-bot error:', err)
    try { db.prepare('ROLLBACK').run() } catch (_) {}
    res.status(500).json({ error: err.message })
  }
})

// Broadcast message
router.post('/broadcast', (req, res) => {
  // This would use WebSocket in production
  res.json({ success: true, message: 'Broadcast sent' })
})

// Get admin payment configs
router.get('/payment-configs', (req, res) => {
  const db = req.db
  const rows = db.prepare('SELECT method, qr_payload, display_value, reference_hint, is_active, updated_at, bank_payee_name, bank_account_number, bank_ifsc_code, bank_qr_payload, upi_id, upi_qr_payload FROM payment_configs ORDER BY method ASC').all()
  res.json({ paymentConfigs: rows })
})

// Update admin payment config by method (upsert)
router.put('/payment-configs/:method', (req, res) => {
  const db = req.db
  const method = req.params.method
  const {
    qr_payload,
    display_value,
    reference_hint,
    is_active,

    bank_payee_name,
    bank_account_number,
    bank_ifsc_code,
    bank_qr_payload,

    upi_id,
    upi_qr_payload,
  } = req.body || {}

  const safeQr = String(qr_payload ?? '')
  const safeDisplay = String(display_value ?? '')
  const safeRefHint = String(reference_hint ?? '')
  const safeActive = is_active === undefined ? 1 : (is_active ? 1 : 0)

  const safeBankPayeeName = String(bank_payee_name ?? '')
  const safeBankAccountNumber = String(bank_account_number ?? '')
  const safeBankIfscCode = String(bank_ifsc_code ?? '')
  const safeBankQrPayload = String(bank_qr_payload ?? '')

  const safeUpiId = String(upi_id ?? '')
  const safeUpiQrPayload = String(upi_qr_payload ?? '')


  const existing = db.prepare('SELECT method FROM payment_configs WHERE method = ?').get(method)
  if (existing) {
    db.prepare(`
      UPDATE payment_configs
      SET
        qr_payload = ?,
        display_value = ?,
        reference_hint = ?,
        is_active = ?,
        bank_payee_name = ?,
        bank_account_number = ?,
        bank_ifsc_code = ?,
        bank_qr_payload = ?,
        upi_id = ?,
        upi_qr_payload = ?,
        updated_at = datetime('now')
      WHERE method = ?
    `).run(
      safeQr,
      safeDisplay,
      safeRefHint,
      safeActive,
      safeBankPayeeName,
      safeBankAccountNumber,
      safeBankIfscCode,
      safeBankQrPayload,
      safeUpiId,
      safeUpiQrPayload,
      method
    )
  } else {
    db.prepare(`
      INSERT INTO payment_configs (
        method,
        qr_payload,
        display_value,
        reference_hint,
        is_active,
        updated_at,
        bank_payee_name,
        bank_account_number,
        bank_ifsc_code,
        bank_qr_payload,
        upi_id,
        upi_qr_payload
      )
      VALUES (?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?, ?)
    `).run(
      method,
      safeQr,
      safeDisplay,
      safeRefHint,
      safeActive,
      safeBankPayeeName,
      safeBankAccountNumber,
      safeBankIfscCode,
      safeBankQrPayload,
      safeUpiId,
      safeUpiQrPayload
    )
  }

  res.json({ success: true })
})

export default router

