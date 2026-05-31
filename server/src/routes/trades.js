import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { authenticateToken } from '../middleware/auth.js'
import { getCurrentPrice } from '../services/marketEngine.js'

const router = Router()

// Place a trade
router.post('/', authenticateToken, (req, res) => {
  const db = req.db
  const { tournament_id, asset, direction, amount, entry_price, expiry_seconds } = req.body

  if (!tournament_id || !asset || !direction || amount == null || entry_price == null) {
    return res.status(400).json({ error: 'Missing trade fields' })
  }

  const tradeAmount = Number(amount)
  const entryPrice = Number(entry_price)
  if (!Number.isFinite(tradeAmount) || tradeAmount <= 0) {
    return res.status(400).json({ error: 'Invalid trade amount' })
  }
  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    return res.status(400).json({ error: 'Invalid entry price' })
  }

  if (!['up', 'down'].includes(direction)) {
    return res.status(400).json({ error: 'Direction must be up or down' })
  }

  const pendingTrade = db.prepare(`
    SELECT id FROM trades
    WHERE tournament_id = ? AND user_id = ? AND result = 'pending'
    LIMIT 1
  `).get(tournament_id, req.user.id)
  if (pendingTrade) {
    return res.status(400).json({ error: 'You already have an active trade' })
  }

  // Get participant
  const participant = db.prepare(`
    SELECT * FROM tournament_participants WHERE tournament_id = ? AND user_id = ?
  `).get(tournament_id, req.user.id)

  if (!participant) return res.status(400).json({ error: 'Not in this tournament' })
  if (participant.balance < tradeAmount) {
    return res.status(400).json({ error: 'Insufficient tournament balance' })
  }

  // Deduct amount only if balance still sufficient (prevents overdraft races)
  const debit = db.prepare(`
    UPDATE tournament_participants
    SET balance = balance - ?, trade_count = trade_count + 1
    WHERE id = ? AND balance >= ?
  `).run(tradeAmount, participant.id, tradeAmount)
  if (debit.changes !== 1) {
    return res.status(400).json({ error: 'Insufficient tournament balance' })
  }

  // Create trade
  const tradeId = uuid()
  db.prepare(`
    INSERT INTO trades (id, tournament_id, user_id, asset, direction, amount, entry_price, expiry_seconds)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(tradeId, tournament_id, req.user.id, asset, direction, tradeAmount, entryPrice, expiry_seconds || 60)

  const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(tradeId)
  const updatedParticipant = db.prepare('SELECT * FROM tournament_participants WHERE id = ?').get(participant.id)

  res.json({ trade, balance: updatedParticipant.balance })
})

// Settle a trade (client triggers timing; server uses authoritative market price)
router.post('/:tradeId/settle', authenticateToken, (req, res) => {
  const db = req.db

  const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(req.params.tradeId)
  if (!trade) return res.status(404).json({ error: 'Trade not found' })
  if (trade.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Cannot settle another user\'s trade' })
  }
  if (trade.result !== 'pending') {
    return res.status(400).json({ error: 'Trade already settled' })
  }

  // Server-side price — client-supplied exit_price must not control payouts
  const exitPrice = getCurrentPrice(trade.asset)
  if (!exitPrice || exitPrice <= 0) {
    return res.status(503).json({ error: 'Market price unavailable' })
  }

  let result = 'loss'
  let profitLoss = -trade.amount

  if (trade.direction === 'up' && exitPrice > trade.entry_price) {
    result = 'win'
    profitLoss = trade.amount * 0.85
  } else if (trade.direction === 'down' && exitPrice < trade.entry_price) {
    result = 'win'
    profitLoss = trade.amount * 0.85
  }

  // Atomic settle — prevents double payout if settle is called twice
  const settled = db.prepare(`
    UPDATE trades SET exit_price = ?, result = ?, profit_loss = ?, settled_at = datetime('now')
    WHERE id = ? AND user_id = ? AND result = 'pending'
  `).run(exitPrice, result, profitLoss, trade.id, req.user.id)

  if (settled.changes !== 1) {
    return res.status(400).json({ error: 'Trade already settled' })
  }

  if (result === 'win') {
    const payout = trade.amount + profitLoss
    db.prepare(`
      UPDATE tournament_participants
      SET balance = balance + ?, win_count = win_count + 1, profit_loss = profit_loss + ?
      WHERE tournament_id = ? AND user_id = ?
    `).run(payout, profitLoss, trade.tournament_id, trade.user_id)
  } else {
    db.prepare(`
      UPDATE tournament_participants
      SET loss_count = loss_count + 1, profit_loss = profit_loss - ?
      WHERE tournament_id = ? AND user_id = ?
    `).run(trade.amount, trade.tournament_id, trade.user_id)
  }

  const updatedTrade = db.prepare('SELECT * FROM trades WHERE id = ?').get(trade.id)
  const participant = db.prepare(`
    SELECT * FROM tournament_participants WHERE tournament_id = ? AND user_id = ?
  `).get(trade.tournament_id, trade.user_id)

  res.json({ trade: updatedTrade, balance: participant.balance })
})

// Get trade history
router.get('/history/:tournamentId', authenticateToken, (req, res) => {
  const db = req.db
  const trades = db.prepare(`
    SELECT * FROM trades WHERE tournament_id = ? AND user_id = ?
    ORDER BY created_at DESC LIMIT 100
  `).all(req.params.tournamentId, req.user.id)
  
  res.json(trades)
})

export default router
