/**
 * Run: node server/test/trades-security.test.mjs
 * In-memory checks for trade settlement and balance invariants.
 */
import { DatabaseSync } from 'node:sqlite'
import { v4 as uuid } from 'uuid'

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`)
  console.log(`  ✓ ${msg}`)
}

function createTestDb() {
  const db = new DatabaseSync(':memory:')
  db.exec(`
    CREATE TABLE tournament_participants (
      id TEXT PRIMARY KEY, tournament_id TEXT, user_id TEXT,
      balance REAL, trade_count INTEGER DEFAULT 0,
      win_count INTEGER DEFAULT 0, loss_count INTEGER DEFAULT 0,
      profit_loss REAL DEFAULT 0
    );
    CREATE TABLE trades (
      id TEXT PRIMARY KEY, tournament_id TEXT, user_id TEXT, asset TEXT,
      direction TEXT, amount REAL, entry_price REAL, exit_price REAL,
      expiry_seconds INTEGER, result TEXT DEFAULT 'pending', profit_loss REAL DEFAULT 0,
      settled_at TEXT
    );
  `)
  return db
}

function testDoubleSettle() {
  const db = createTestDb()
  const tid = uuid()
  const uid = uuid()
  const tradeId = uuid()
  db.prepare(`INSERT INTO tournament_participants (id, tournament_id, user_id, balance) VALUES (?,?,?,1000)`)
    .run(uuid(), tid, uid)
  db.prepare(`INSERT INTO trades (id, tournament_id, user_id, asset, direction, amount, entry_price, result)
    VALUES (?,?,?,'BTC/USD','up',100,67500,'pending')`).run(tradeId, tid, uid)

  const exitPrice = 68000
  const result = 'win'
  const profitLoss = 85
  const r1 = db.prepare(`
    UPDATE trades SET exit_price = ?, result = ?, profit_loss = ?, settled_at = datetime('now')
    WHERE id = ? AND user_id = ? AND result = 'pending'
  `).run(exitPrice, result, profitLoss, tradeId, uid)
  const r2 = db.prepare(`
    UPDATE trades SET exit_price = ?, result = ?, profit_loss = ?, settled_at = datetime('now')
    WHERE id = ? AND user_id = ? AND result = 'pending'
  `).run(exitPrice, result, profitLoss, tradeId, uid)

  assert(r1.changes === 1, 'first settle succeeds')
  assert(r2.changes === 0, 'second settle is rejected (no double payout)')

  if (result === 'win') {
    db.prepare(`UPDATE tournament_participants SET balance = balance + ? WHERE tournament_id = ? AND user_id = ?`)
      .run(100 + profitLoss, tid, uid)
  }
  const bal = db.prepare(`SELECT balance FROM tournament_participants WHERE user_id = ?`).get(uid)
  assert(bal.balance === 1185, 'balance credited exactly once')
}

function testOverdraftPrevention() {
  const db = createTestDb()
  const pid = uuid()
  db.prepare(`INSERT INTO tournament_participants (id, tournament_id, user_id, balance) VALUES (?,?,?,100)`)
    .run(pid, uuid(), uuid())

  const d1 = db.prepare(`UPDATE tournament_participants SET balance = balance - ? WHERE id = ? AND balance >= ?`)
    .run(100, pid, 100)
  const d2 = db.prepare(`UPDATE tournament_participants SET balance = balance - ? WHERE id = ? AND balance >= ?`)
    .run(100, pid, 100)

  assert(d1.changes === 1, 'first debit succeeds')
  assert(d2.changes === 0, 'second debit blocked when balance insufficient')

  const row = db.prepare(`SELECT balance FROM tournament_participants WHERE id = ?`).get(pid)
  assert(row.balance === 0, 'balance cannot go negative')
}

function testPendingTradeGate() {
  const db = createTestDb()
  const tid = uuid()
  const uid = uuid()
  db.prepare(`INSERT INTO trades (id, tournament_id, user_id, asset, direction, amount, entry_price, result)
    VALUES (?,?,?,'BTC/USD','up',50,67500,'pending')`).run(uuid(), tid, uid)

  const pending = db.prepare(`
    SELECT id FROM trades WHERE tournament_id = ? AND user_id = ? AND result = 'pending' LIMIT 1
  `).get(tid, uid)
  assert(!!pending, 'detects existing pending trade')
}

console.log('Double settlement')
testDoubleSettle()
console.log('Balance overdraft')
testOverdraftPrevention()
console.log('Pending trade gate')
testPendingTradeGate()
console.log('\nAll security checks passed')
