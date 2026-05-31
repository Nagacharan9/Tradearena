import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { authenticateToken, isAdmin } from '../middleware/auth.js'

const router = Router()

function normalizeTournamentStatus(db, tournament) {
  if (!tournament) return tournament
  const now = Date.now()

  // upcoming → active when start_time has passed
  if (
    tournament.status === 'upcoming' &&
    tournament.start_time &&
    new Date(tournament.start_time).getTime() <= now
  ) {
    db.prepare(`UPDATE tournaments SET status = 'active' WHERE id = ?`).run(tournament.id)
    tournament = { ...tournament, status: 'active' }
  }

  // active → completed when end_time has passed
  if (
    tournament.status === 'active' &&
    tournament.end_time &&
    new Date(tournament.end_time).getTime() < now
  ) {
    db.prepare(`UPDATE tournaments SET status = 'completed' WHERE id = ?`).run(tournament.id)
    tournament = { ...tournament, status: 'completed' }
  }

  return tournament
}

// Get all tournaments (only real admin-created / user-facing events)
router.get('/', (req, res) => {
  const db = req.db
  const rows = db.prepare(`
    SELECT * FROM tournaments ORDER BY 
      CASE status 
        WHEN 'active' THEN 1 
        WHEN 'upcoming' THEN 2 
        WHEN 'completed' THEN 3 
      END, start_time ASC
  `).all()
  const tournaments = rows.map(t => normalizeTournamentStatus(db, t))
  res.json({ tournaments })
})

// Get single tournament with leaderboard
router.get('/:id', (req, res) => {
  const db = req.db
  let tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id)
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' })
  tournament = normalizeTournamentStatus(db, tournament)

  const leaderboard = db.prepare(`
    SELECT tp.*, u.username, u.avatar, u.country
    FROM tournament_participants tp
    JOIN users u ON tp.user_id = u.id
    WHERE tp.tournament_id = ?
    ORDER BY tp.balance DESC
  `).all(req.params.id)

  res.json({ tournament, leaderboard })
})

// Get all tournaments the current user has joined
router.get('/joined', authenticateToken, (req, res) => {
  const db = req.db
  const rows = db.prepare(`
    SELECT t.*, tp.balance as my_balance, tp.profit_loss, tp.rank, tp.trade_count
    FROM tournament_participants tp
    JOIN tournaments t ON t.id = tp.tournament_id
    WHERE tp.user_id = ?
    ORDER BY tp.joined_at DESC
  `).all(req.user.id)
  const tournaments = rows.map(t => normalizeTournamentStatus(db, t))
  res.json({ tournaments })
})

// Create tournament (admin only)
router.post('/', authenticateToken, isAdmin, (req, res) => {
  const db = req.db
  const {
    title, description, asset, entry_fee, prize_pool,
    tournament_balance, min_players, max_players,
    duration_minutes, start_time, tier, is_private,
    bot_enabled, bot_difficulty, bot_min, bot_max, prize_split, re_entry
  } = req.body

  const id = uuid()
  const startDate = start_time ? new Date(start_time) : new Date()
  if (Number.isNaN(startDate.getTime())) {
    return res.status(400).json({ error: 'Invalid start_time' })
  }
  const endDate = new Date(startDate.getTime() + (duration_minutes || 60) * 60000)
  const status = req.body.status === 'active' ? 'active' : 'upcoming'
  const botMin = Math.max(0, Number.parseInt(bot_min ?? 0, 10) || 0)
  const botMax = Math.max(botMin, Number.parseInt(bot_max ?? 0, 10) || 0)

  db.prepare(`
    INSERT INTO tournaments (id, title, description, asset, entry_fee, prize_pool,
      tournament_balance, min_players, max_players, duration_minutes,
      start_time, end_time, status, tier, is_private, bot_enabled, bot_difficulty,
      bot_min, bot_max, prize_split, re_entry, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, title, description || '', asset || 'BTC/USD',
    entry_fee || 0, prize_pool || 0, tournament_balance || req.body.starting_balance || 10000,
    min_players || 2, max_players || 500, duration_minutes || 60,
    startDate.toISOString(), endDate.toISOString(), status,
    tier || 'silver', is_private ? 1 : 0,
    bot_enabled !== false ? 1 : 0, bot_difficulty || 'medium',
    botMin, botMax,
    JSON.stringify(prize_split || req.body.prizes || { "1": 50, "2": 30, "3": 20 }),
    re_entry ? 1 : 0, req.user.id
  )

  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id)
  res.json({ tournament })
})

// Join tournament
router.post('/:id/join', authenticateToken, (req, res) => {
  const db = req.db
  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id)
  
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' })
  if (tournament.current_players >= tournament.max_players) {
    return res.status(400).json({ error: 'Tournament is full' })
  }

  // Check if already joined
  const existing = db.prepare('SELECT id FROM tournament_participants WHERE tournament_id = ? AND user_id = ?')
    .get(req.params.id, req.user.id)
  if (existing) return res.status(400).json({ error: 'Already joined' })

  // Check wallet balance for entry fee
  if (tournament.entry_fee > 0) {
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user.id)
    if (!wallet || wallet.real_balance < tournament.entry_fee) {
      return res.status(400).json({ error: 'Insufficient balance' })
    }
    const debit = db.prepare(`
      UPDATE wallets SET real_balance = real_balance - ? WHERE user_id = ? AND real_balance >= ?
    `).run(tournament.entry_fee, req.user.id, tournament.entry_fee)
    if (debit.changes !== 1) {
      return res.status(400).json({ error: 'Insufficient balance' })
    }
    db.prepare('UPDATE users SET real_balance = real_balance - ? WHERE id = ?')
      .run(tournament.entry_fee, req.user.id)
    // Log transaction
    db.prepare('INSERT INTO transactions (id, user_id, type, amount, status, reference) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uuid(), req.user.id, 'tournament_entry', -tournament.entry_fee, 'completed', `Tournament: ${tournament.title}`)
  }

  // Add participant
  db.prepare(`
    INSERT INTO tournament_participants (id, tournament_id, user_id, balance)
    VALUES (?, ?, ?, ?)
  `).run(uuid(), req.params.id, req.user.id, tournament.tournament_balance)

  // Update player count
  db.prepare('UPDATE tournaments SET current_players = current_players + 1 WHERE id = ?')
    .run(req.params.id)

  // Update user stats
  db.prepare('UPDATE users SET total_tournaments = total_tournaments + 1 WHERE id = ?')
    .run(req.user.id)

  res.json({ 
    success: true, 
    balance: tournament.tournament_balance,
    message: `Joined ${tournament.title}!` 
  })
})

// Get my tournament data
router.get('/:id/my-data', authenticateToken, (req, res) => {
  const db = req.db
  const participant = db.prepare(`
    SELECT * FROM tournament_participants 
    WHERE tournament_id = ? AND user_id = ?
  `).get(req.params.id, req.user.id)

  if (!participant) return res.status(404).json({ error: 'Not a participant' })

  const trades = db.prepare(`
    SELECT * FROM trades 
    WHERE tournament_id = ? AND user_id = ?
    ORDER BY created_at DESC LIMIT 50
  `).all(req.params.id, req.user.id)

  res.json({ participant, trades })
})

export default router
