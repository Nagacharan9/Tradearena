import { initDB } from './server/src/config/db.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

try {
  const db = initDB()
  const email = 'admin@tradearena.com'
  const password = 'admin123'
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  console.log("User:", !!user)
  const valid = bcrypt.compareSync(password, user.password)
  console.log("Valid pass:", valid)
  const token = jwt.sign(
    { id: user.id, username: user.username, email: user.email, role: user.role },
    'tradearena_secret_key_2026_ultra_secure',
    { expiresIn: '7d' }
  )
  console.log("Token generated")
} catch (e) {
  console.error("Login failed:", e)
}
