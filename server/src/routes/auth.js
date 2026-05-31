



import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { v4 as uuid } from 'uuid'
import { generateToken, authenticateToken } from '../middleware/auth.js'

const router = Router()

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function makeResetResponse(rawToken) {
  const response = { success: true, message: 'If that email exists, a reset link has been generated.' }
  if (process.env.NODE_ENV !== 'production') {
    response.resetToken = rawToken
    response.resetUrl = `/reset-password/${rawToken}`
  }
  return response
}

// Request OTP for registration
router.post('/register/request-otp', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase()
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' })
    }
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    
    // For now, just log OTP (replace with email sending later)
    console.log(`OTP for ${email}: ${otp}`)
    
    // In production, you would store this OTP in DB/cache with expiry
    // For demo, we'll just return success
    res.json({ success: true, message: 'OTP sent successfully' })
  } catch (err) {
    console.error('Request OTP error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Verify OTP for registration
router.post('/register/verify-otp', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const otp = String(req.body?.otp || '')
    
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP required' })
    }
    
    // For demo, always accept any 6-digit OTP
    // In production, verify against stored OTP
    if (otp.length === 6 && /^\d+$/.test(otp)) {
      res.json({ success: true, message: 'OTP verified successfully' })
    } else {
      res.status(400).json({ error: 'Invalid OTP' })
    }
  } catch (err) {
    console.error('Verify OTP error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Register
router.post('/register', async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim()
    const email = String(req.body?.email || '').trim().toLowerCase()
    const password = String(req.body?.password || '')
    const referralCode = String(req.body?.referralCode || '').trim()
    const now = Date.now()


    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields required' })
    }

    const db = req.db

    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username)
    if (existing) {
      return res.status(400).json({ error: 'Email or username already exists' })
    }

    const hashedPassword = bcrypt.hashSync(password, 10)
    const userId = uuid()

    // Random numeric user-facing UID (8-10 digits) for display/lookup
    const generateNumericUid = () => {
      for (let attempt = 0; attempt < 20; attempt++) {
        const len = 8 + Math.floor(Math.random() * 3) // 8..10
        let s = ''
        for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10)
        const uid = s
        const exists = db.prepare('SELECT id FROM users WHERE uid = ?').get(uid)
        if (!exists) return uid
      }
      const fallback = String(Date.now()).slice(-9)
      return fallback
    }

    const userUid = generateNumericUid()
    const userReferralCode = username.toUpperCase().slice(0, 6) + Math.random().toString(36).slice(2, 6).toUpperCase()


    let referrerId = null
    if (referralCode) {
      const referrer = db.prepare('SELECT id FROM users WHERE referral_code = ?').get(referralCode)
      if (referrer) referrerId = referrer.id
    }

    db.prepare(`
      INSERT INTO users (id, uid, username, email, password, referral_code, referred_by, session_version)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).run(userId, userUid, username, email, hashedPassword, userReferralCode, referrerId)


    db.prepare(`
      INSERT INTO wallets (id, user_id) VALUES (?, ?)
    `).run(uuid(), userId)

    if (referrerId) {
      db.prepare(`
        INSERT INTO referrals (id, referrer_id, referred_id) VALUES (?, ?, ?)
      `).run(uuid(), referrerId, userId)
    }

    const user = db.prepare(`
      SELECT id, uid, username, email, role, real_balance, avatar, country, referral_code,
        rank_level, win_count, loss_count, total_tournaments, session_version
      FROM users WHERE id = ?
    `).get(userId)




    const token = generateToken(user)
    res.json({ token, user })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const password = String(req.body?.password || '')
    const db = req.db

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    if (!user) return res.status(400).json({ error: 'Invalid credentials' })

    const valid = bcrypt.compareSync(password, user.password)
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' })

    const token = generateToken(user)
    const { password: _, ...safeUser } = user
    res.json({ token, user: safeUser })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Logout
router.post('/logout', authenticateToken, (req, res) => {
  const db = req.db
  db.prepare(`
    UPDATE users
    SET session_version = COALESCE(session_version, 0) + 1,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(req.user.id)
  res.json({ success: true })
})

// Get profile
router.get('/me', authenticateToken, (req, res) => {
  const db = req.db
  const user = db.prepare(`
    SELECT id, username, email, role, avatar, country, real_balance, bonus_balance,
      referral_code, rank_level, win_count, loss_count, total_tournaments, preferred_currency,
      session_version, created_at
    FROM users WHERE id = ?
  `).get(req.user.id)
  if (!user) return res.status(404).json({ error: 'User not found' })

  const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user.id)
  res.json({ user, wallet })
})

// Get user transaction history
router.get('/transactions', authenticateToken, (req, res) => {
  const db = req.db
  const txs = db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id)
  res.json(txs)
})

// Request deposit (requires admin approval)
router.post('/deposit', authenticateToken, (req, res) => {
  const db = req.db
  const amount = Number(req.body?.amount)
  const method = String(req.body?.method || '')
  const reference = String(req.body?.reference || '').trim()

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' })
  }

  const id = uuid()
  db.prepare(`
    INSERT INTO transactions (id, user_id, type, amount, status, method, reference)
    VALUES (?, ?, 'deposit', ?, 'pending', ?, ?)
  `).run(id, req.user.id, amount, method, reference)

  res.json({ success: true, message: 'Deposit request submitted for admin approval' })
})

function serializeWithdrawalDetails(method, rawDetails) {
  if (!rawDetails) return ''
  const details = typeof rawDetails === 'string' ? (() => {
    try {
      return JSON.parse(rawDetails)
    } catch {
      return { value: rawDetails }
    }
  })() : rawDetails

  const normalizedMethod = String(method || '').toLowerCase()

  if (normalizedMethod === 'bank') {
    return JSON.stringify({
      method: 'bank',
      account_holder_name: String(details.account_holder_name || '').trim(),
      bank_name: String(details.bank_name || '').trim(),
      account_number: String(details.account_number || '').trim(),
      ifsc_code: String(details.ifsc_code || '').trim(),
      branch: String(details.branch || '').trim(),
      note: String(details.note || '').trim(),
    })
  }

  if (normalizedMethod === 'upi') {
    return JSON.stringify({
      method: 'upi',
      upi_id: String(details.upi_id || '').trim(),
      account_holder_name: String(details.account_holder_name || '').trim(),
      note: String(details.note || '').trim(),
    })
  }

  if (normalizedMethod === 'crypto') {
    return JSON.stringify({
      method: 'crypto',
      wallet_address: String(details.wallet_address || '').trim(),
      network: String(details.network || '').trim(),
      note: String(details.note || '').trim(),
    })
  }

  return JSON.stringify({
    method: normalizedMethod || 'unknown',
    ...details,
  })
}

// Request withdrawal (requires admin approval)
router.post('/withdraw', authenticateToken, (req, res) => {
  const db = req.db
  const amount = Number(req.body?.amount)
  const method = String(req.body?.method || '')
  const withdrawalDetails = req.body?.withdrawalDetails || req.body?.payoutDetails || req.body?.details || null

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' })
  }

  const normalizedMethod = method.toLowerCase()
  if (!['bank', 'upi', 'crypto', 'violetv_pay'].includes(normalizedMethod)) {
    return res.status(400).json({ error: 'Unsupported withdrawal method' })
  }

  const serializedDetails = serializeWithdrawalDetails(normalizedMethod, withdrawalDetails)

  if (['bank', 'upi', 'crypto'].includes(normalizedMethod)) {
    try {
      const parsed = serializedDetails ? JSON.parse(serializedDetails) : {}
      const missing =
        normalizedMethod === 'bank'
          ? !parsed.account_holder_name || !parsed.bank_name || !parsed.account_number || !parsed.ifsc_code
          : normalizedMethod === 'upi'
          ? !parsed.upi_id
          : !parsed.wallet_address || !parsed.network

      if (missing) {
        return res.status(400).json({ error: 'Withdrawal payout details required' })
      }
    } catch {
      return res.status(400).json({ error: 'Withdrawal payout details required' })
    }
  }

  const wallet = db.prepare('SELECT real_balance FROM wallets WHERE user_id = ?').get(req.user.id)
  if (!wallet || wallet.real_balance < amount) {
    return res.status(400).json({ error: 'Insufficient balance' })
  }

  const debit = db.prepare(`
    UPDATE wallets SET real_balance = real_balance - ? WHERE user_id = ? AND real_balance >= ?
  `).run(amount, req.user.id, amount)
  if (debit.changes !== 1) {
    return res.status(400).json({ error: 'Insufficient balance' })
  }

  db.prepare('UPDATE users SET real_balance = real_balance - ? WHERE id = ?').run(amount, req.user.id)

  const id = uuid()
  db.prepare(`
    INSERT INTO transactions (id, user_id, type, amount, status, method, reference)
    VALUES (?, ?, 'withdrawal', ?, 'pending', ?, ?)
  `).run(id, req.user.id, -amount, normalizedMethod, serializedDetails)

  res.json({ success: true, message: 'Withdrawal request submitted for admin approval' })
})

// Transfer real balance → tournament balance (instant, no admin approval)
router.post('/transfer', authenticateToken, (req, res) => {
  const db = req.db
  const amount = Number(req.body?.amount)

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' })
  }

  const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user.id)
  if (!wallet || wallet.real_balance < amount) {
    return res.status(400).json({ error: 'Insufficient balance' })
  }

  const debit = db.prepare(`
    UPDATE wallets
    SET real_balance = real_balance - ?, tournament_balance = tournament_balance + ?
    WHERE user_id = ? AND real_balance >= ?
  `).run(amount, amount, req.user.id, amount)
  if (debit.changes !== 1) {
    return res.status(400).json({ error: 'Insufficient balance' })
  }

  db.prepare('UPDATE users SET real_balance = real_balance - ? WHERE id = ?').run(amount, req.user.id)

  const updated = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user.id)
  res.json({ success: true, wallet: updated })
})

const ALLOWED_CURRENCIES = new Set([
  'INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'JPY', 'CAD', 'AUD', 'BRL', 'CHF', 'CNY', 'PKR', 'BDT', 'LKR',
])

router.post('/password-reset/request', async (req, res) => {
  try {
    const db = req.db
    const email = String(req.body?.email || '').trim().toLowerCase()
    if (!email) return res.status(400).json({ error: 'Email required' })

    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (user) {
      const rawToken = crypto.randomUUID().replace(/-/g, '')
      const tokenHash = hashResetToken(rawToken)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

      db.prepare(`
        INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
        VALUES (?, ?, ?, ?)
      `).run(uuid(), user.id, tokenHash, expiresAt)

      return res.json(makeResetResponse(rawToken))
    }

    res.json(makeResetResponse(''))
  } catch (err) {
    console.error('Password reset request error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/password-reset/confirm', async (req, res) => {
  try {
    const db = req.db
    const token = String(req.body?.token || '').trim()
    const password = String(req.body?.password || '')

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password required' })
    }

    const tokenHash = hashResetToken(token)
    const row = db.prepare(`
      SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at, u.id AS user_id_check
      FROM password_reset_tokens prt
      JOIN users u ON u.id = prt.user_id
      WHERE prt.token_hash = ?
      ORDER BY prt.created_at DESC
      LIMIT 1
    `).get(tokenHash)

    if (!row) return res.status(400).json({ error: 'Invalid or expired reset token' })
    if (row.used_at) return res.status(400).json({ error: 'Reset token already used' })
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired reset token' })
    }

    const hashedPassword = bcrypt.hashSync(password, 10)
    db.prepare('UPDATE users SET password = ?, session_version = COALESCE(session_version, 0) + 1, updated_at = datetime(\'now\') WHERE id = ?')
      .run(hashedPassword, row.user_id)

    db.prepare('UPDATE password_reset_tokens SET used_at = datetime(\'now\') WHERE id = ?').run(row.id)

    res.json({ success: true, message: 'Password updated successfully' })
  } catch (err) {
    console.error('Password reset confirm error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Update profile preferences (display currency, country)
router.patch('/profile', authenticateToken, (req, res) => {
  const db = req.db
  const { preferred_currency, country } = req.body

  if (preferred_currency !== undefined) {
    const code = String(preferred_currency).toUpperCase()
    if (!ALLOWED_CURRENCIES.has(code)) {
      return res.status(400).json({ error: 'Unsupported currency' })
    }
    db.prepare('UPDATE users SET preferred_currency = ? WHERE id = ?').run(code, req.user.id)
  }

  if (country !== undefined && typeof country === 'string' && country.length <= 8) {
    db.prepare('UPDATE users SET country = ? WHERE id = ?').run(country, req.user.id)
  }

  const user = db.prepare(`
    SELECT id, username, email, role, avatar, country, real_balance, bonus_balance,
      referral_code, rank_level, win_count, loss_count, total_tournaments, preferred_currency,
      session_version, created_at
    FROM users WHERE id = ?
  `).get(req.user.id)

  res.json({ user })
})

export default router
