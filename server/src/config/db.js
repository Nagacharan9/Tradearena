import { DatabaseSync } from 'node:sqlite'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuid } from 'uuid'
import bcrypt from 'bcryptjs'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '../../data')

export function initDB() {
  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

  const db = new DatabaseSync(path.join(dataDir, 'tradearena.db'))

  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')

   // Create tables
   db.exec(`
     CREATE TABLE IF NOT EXISTS users (
       id TEXT PRIMARY KEY,
       uid TEXT UNIQUE,
       username TEXT UNIQUE NOT NULL,
       email TEXT UNIQUE NOT NULL,
       password TEXT NOT NULL,
       avatar TEXT DEFAULT '',
       country TEXT DEFAULT '🌍',
       role TEXT DEFAULT 'user',
       real_balance REAL DEFAULT 0,
       bonus_balance REAL DEFAULT 0,
       referral_code TEXT UNIQUE,
       referred_by TEXT,
       rank_level INTEGER DEFAULT 1,
       win_count INTEGER DEFAULT 0,
       loss_count INTEGER DEFAULT 0,
       total_tournaments INTEGER DEFAULT 0,
       session_version INTEGER DEFAULT 0,
       created_at TEXT DEFAULT (datetime('now')),
       updated_at TEXT DEFAULT (datetime('now'))
     );

    CREATE TABLE IF NOT EXISTS tournaments (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      asset TEXT DEFAULT 'BTC/USD',
      entry_fee REAL DEFAULT 0,
      prize_pool REAL DEFAULT 0,
      tournament_balance REAL DEFAULT 10000,
      min_players INTEGER DEFAULT 2,
      max_players INTEGER DEFAULT 500,
      current_players INTEGER DEFAULT 0,
      duration_minutes INTEGER DEFAULT 60,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      status TEXT DEFAULT 'upcoming',
      tier TEXT DEFAULT 'silver',
      is_private INTEGER DEFAULT 0,
      bot_enabled INTEGER DEFAULT 1,
      bot_difficulty TEXT DEFAULT 'medium',
      bot_min INTEGER DEFAULT 0,
      bot_max INTEGER DEFAULT 0,
      prize_split TEXT DEFAULT '{"1":50,"2":30,"3":20}',
      re_entry INTEGER DEFAULT 0,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tournament_participants (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      balance REAL DEFAULT 10000,
      profit_loss REAL DEFAULT 0,
      win_count INTEGER DEFAULT 0,
      loss_count INTEGER DEFAULT 0,
      trade_count INTEGER DEFAULT 0,
      rank INTEGER DEFAULT 0,
      is_bot INTEGER DEFAULT 0,
      joined_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
      UNIQUE(tournament_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS trades (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      asset TEXT NOT NULL,
      direction TEXT NOT NULL,
      amount REAL NOT NULL,
      entry_price REAL NOT NULL,
      exit_price REAL,
      expiry_seconds INTEGER DEFAULT 60,
      result TEXT DEFAULT 'pending',
      profit_loss REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      settled_at TEXT,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
    );

    CREATE TABLE IF NOT EXISTS bots (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT DEFAULT '',
      country TEXT DEFAULT '',
      difficulty TEXT DEFAULT 'medium',
      aggression REAL DEFAULT 0.5,
      win_ratio REAL DEFAULT 0.5,
      chat_personality TEXT DEFAULT 'silent',
      is_puppet INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      message TEXT NOT NULL,
      is_pinned INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      real_balance REAL DEFAULT 0,
      tournament_balance REAL DEFAULT 0,
      bonus_balance REAL DEFAULT 0,
      total_deposited REAL DEFAULT 0,
      total_withdrawn REAL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      method TEXT DEFAULT '',
      reference TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      referrer_id TEXT NOT NULL,
      referred_id TEXT NOT NULL,
      status TEXT DEFAULT 'registered',
      reward_paid INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payment_configs (
      method TEXT PRIMARY KEY,
      qr_payload TEXT DEFAULT '',
      display_value TEXT DEFAULT '',
      reference_hint TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now')),

      -- Bank deposit specific config (used by WalletPage when method = 'bank')
      bank_payee_name TEXT DEFAULT '',
      bank_account_number TEXT DEFAULT '',
      bank_ifsc_code TEXT DEFAULT '',
      bank_qr_payload TEXT DEFAULT '',

      -- UPI deposit specific config (used by WalletPage when method = 'upi')
      upi_id TEXT DEFAULT '',
      upi_qr_payload TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `)


  // ✅ Run migrations for columns that may not exist in older DBs
  const migrations = [
    `ALTER TABLE transactions ADD COLUMN reference TEXT DEFAULT ''`,
    `ALTER TABLE wallets ADD COLUMN total_deposited REAL DEFAULT 0`,
    `ALTER TABLE wallets ADD COLUMN total_withdrawn REAL DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN preferred_currency TEXT DEFAULT 'USD'`,
    `ALTER TABLE users ADD COLUMN uid TEXT UNIQUE`,
    `ALTER TABLE users ADD COLUMN session_version INTEGER DEFAULT 0`,
    `ALTER TABLE tournaments ADD COLUMN bot_min INTEGER DEFAULT 0`,
    `ALTER TABLE tournaments ADD COLUMN bot_max INTEGER DEFAULT 0`,
    `ALTER TABLE payment_configs ADD COLUMN qr_payload TEXT DEFAULT ''`,
    `ALTER TABLE payment_configs ADD COLUMN display_value TEXT DEFAULT ''`,
    `ALTER TABLE payment_configs ADD COLUMN reference_hint TEXT DEFAULT ''`,
    `ALTER TABLE payment_configs ADD COLUMN is_active INTEGER DEFAULT 1`,
    `ALTER TABLE payment_configs ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))`,
    `ALTER TABLE payment_configs ADD COLUMN bank_payee_name TEXT DEFAULT ''`,
    `ALTER TABLE payment_configs ADD COLUMN bank_account_number TEXT DEFAULT ''`,
    `ALTER TABLE payment_configs ADD COLUMN bank_ifsc_code TEXT DEFAULT ''`,
    `ALTER TABLE payment_configs ADD COLUMN bank_qr_payload TEXT DEFAULT ''`,
    `ALTER TABLE payment_configs ADD COLUMN upi_id TEXT DEFAULT ''`,
    `ALTER TABLE payment_configs ADD COLUMN upi_qr_payload TEXT DEFAULT ''`,
    `CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
  ]

  for (const migration of migrations) {
    try {
      db.exec(migration)
    } catch (_) {
      // Column already exists — ignore
    }
  }

  // ✅ Seed payment configs
  const paymentMethods = [
    { method: 'crypto', qr_payload: 'crypto:bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', display_value: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', reference_hint: 'TxID' },
    { method: 'violetv_pay', qr_payload: 'violetv_pay:violet-pay', display_value: 'VioletPay', reference_hint: 'Pay ref' },
    { method: 'upi', qr_payload: 'upi:tradearena@upi', display_value: 'tradearena@upi', reference_hint: 'UPI Ref / UTR', upi_id: 'tradearena@upi' },
    { method: 'stripe', qr_payload: 'stripe:checkout', display_value: 'Card payment', reference_hint: '' },
    { method: 'bank', qr_payload: 'bank:4821-TRADE-ARENA', display_value: '4821-TRADE-ARENA', reference_hint: 'UTR No' },
  ]
  for (const m of paymentMethods) {
    try {
      db.prepare(`
        INSERT OR IGNORE INTO payment_configs (
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
        VALUES (?, ?, ?, ?, 1, datetime('now'), ?, ?, ?, ?, ?, ?)
      `).run(
        m.method,
        m.qr_payload,
        m.display_value,
        m.reference_hint,
        m.bank_payee_name || '',
        m.bank_account_number || '',
        m.bank_ifsc_code || '',
        m.bank_qr_payload || '',
        m.upi_id || '',
        m.upi_qr_payload || ''
      )
    } catch (_) {}
  }

  // ✅ Seed admin user
  const adminExists = db.prepare('SELECT id FROM users WHERE role = ?').get('admin')

  // ✅ Helper: generate a unique numeric UID (8-10 digits) for user-facing ID numbers
  function generateNumericUid(db) {
    // 8-10 digits numeric string; avoid collisions by checking uniqueness.
    for (let attempt = 0; attempt < 20; attempt++) {
      const len = 8 + Math.floor(Math.random() * 3) // 8..10
      let s = ''
      for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10)
      const uid = s
      const exists = db.prepare('SELECT id FROM users WHERE uid = ?').get(uid)
      if (!exists) return uid
    }
    // Very unlikely fallback: use timestamp+random
    const fallback = String(Date.now()).slice(-9) + String(Math.floor(Math.random() * 1000)).padStart(3, '0')
    const exists = db.prepare('SELECT id FROM users WHERE uid = ?').get(fallback)
    return exists ? `${fallback}${Math.floor(Math.random() * 10)}` : fallback
  }

  function backfillMissingUids(db) {
    const rows = db.prepare('SELECT id FROM users WHERE uid IS NULL OR uid = ""').all()
    for (const r of rows) {
      const uid = generateNumericUid(db)
      db.prepare('UPDATE users SET uid = ? WHERE id = ?').run(uid, r.id)
    }
  }


  if (!adminExists) {
    const hashedPw = bcrypt.hashSync('admin123', 10)
    const adminId = uuid()
    const adminUid = generateNumericUid(db)
    db.prepare(`INSERT INTO users (id, uid, username, email, password, role, referral_code, session_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(adminId, adminUid, 'admin', 'admin@tradearena.com', hashedPw, 'admin', 'ADMIN001', 0)

    // ✅ Create wallet for admin
    db.prepare(`INSERT INTO wallets (id, user_id) VALUES (?, ?)`)
      .run(uuid(), adminId)
    console.log('✅ Admin user seeded: admin@tradearena.com / admin123')
  } else {
    // ✅ Ensure admin has a wallet (fix existing installs)
    const adminWallet = db.prepare('SELECT id FROM wallets WHERE user_id = ?').get(adminExists.id)
    if (!adminWallet) {
      db.prepare(`INSERT INTO wallets (id, user_id) VALUES (?, ?)`)
        .run(uuid(), adminExists.id)
      console.log('✅ Created missing wallet for admin')
    }
  }

  // ✅ Backfill numeric UID for existing users without one
  try {
    backfillMissingUids(db)
  } catch (e) {
    // ignore
  }

  // ✅ Ensure all users without wallets get one (fix orphaned users)


  const usersWithoutWallets = db.prepare(`
    SELECT u.id FROM users u
    LEFT JOIN wallets w ON w.user_id = u.id
    WHERE w.id IS NULL
  `).all()
  for (const u of usersWithoutWallets) {
    db.prepare(`INSERT INTO wallets (id, user_id) VALUES (?, ?)`)
      .run(uuid(), u.id)
  }
  if (usersWithoutWallets.length > 0) {
    console.log(`✅ Created wallets for ${usersWithoutWallets.length} users missing them`)
  }

  // Remove legacy auto-seeded demo tournaments (no fake "always live" events)
  const legacyDemoTitles = [
    'Crypto Legends Cup', 'Forex Masters Sprint', 'Diamond Challenge', 'Rapid Fire Blitz',
  ]
  const delDemo = db.prepare(`DELETE FROM tournaments WHERE title = ?`)
  for (const title of legacyDemoTitles) {
    delDemo.run(title)
  }

  // Mark expired tournaments as completed
  db.prepare(`
    UPDATE tournaments SET status = 'completed'
    WHERE status = 'active' AND datetime(end_time) < datetime('now')
  `).run()

  // Replace existing bot country values ('🤖') with realistic country flags
  try {
    const countries = ['🇺🇸', '🇬🇧', '🇨🇦', '🇦🇺', '🇩🇪', '🇫🇷', '🇯🇵', '🇧🇷', '🇮🇳', '🇿🇦']
    const robotUsers = db.prepare("SELECT id FROM users WHERE country = '🤖'").all()
    if (robotUsers.length > 0) {
      const updateBot = db.prepare("UPDATE bots SET country = ? WHERE id = ?")
      const updateUser = db.prepare("UPDATE users SET country = ? WHERE id = ?")
      for (const u of robotUsers) {
        const flag = countries[Math.floor(Math.random() * countries.length)]
        updateBot.run(flag, u.id)
        updateUser.run(flag, u.id)
      }
      console.log(`✅ Migrated ${robotUsers.length} bots from '🤖' to realistic flags`)
    }
  } catch (err) {
    console.error('Failed to run bot country migration:', err)
  }

  console.log('🗄️  Database initialized successfully')
  return db
}
