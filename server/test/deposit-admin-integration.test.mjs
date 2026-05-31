/**
 * Integration: user deposit → admin approve → overview stats
 * Run: node server/test/deposit-admin-integration.test.mjs
 * Requires server on http://localhost:3001
 */
import { DatabaseSync } from 'node:sqlite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const BASE = process.env.API_BASE || 'http://localhost:3001/api'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '../data/tradearena.db')

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`)
  console.log(`  ✓ ${msg}`)
}

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data = {}
  try { data = text ? JSON.parse(text) : {} } catch {}
  return { status: res.status, data }
}

async function main() {
  console.log('Deposit ↔ Admin integration tests\n')

  const health = await api('/health')
  assert(health.status === 200, 'server health')

  const adminLogin = await api('/auth/login', {
    method: 'POST',
    body: { email: 'admin@tradearena.com', password: 'admin123' },
  })
  assert(adminLogin.status === 200 && adminLogin.data.token, 'admin login')
  const adminToken = adminLogin.data.token

  const userEmail = `deposit_test_${Date.now()}@test.com`
  const reg = await api('/auth/register', {
    method: 'POST',
    body: { username: `depo_${Date.now()}`, email: userEmail, password: 'testpass123' },
  })
  assert(reg.status === 200 && reg.data.token, 'register test user')
  const userToken = reg.data.token
  const userId = reg.data.user?.id

  const statsBefore = await api('/admin/stats', { token: adminToken })
  assert(statsBefore.status === 200, 'admin stats before deposit')
  const depositsBefore = statsBefore.data.deposits
  const pendingBefore = statsBefore.data.pendingDepositsCount || 0

  const depositAmount = 250
  const dep = await api('/auth/deposit', {
    method: 'POST',
    token: userToken,
    body: { amount: depositAmount, method: 'upi', reference: 'UTR123456789012' },
  })
  assert(dep.status === 200, 'user submits deposit (pending)')

  const mePending = await api('/auth/me', { token: userToken })
  const walletPending = mePending.data.wallet?.real_balance ?? 0
  assert(walletPending === 0 || walletPending < depositAmount, 'user wallet not credited until approval')

  const statsAfterPending = await api('/admin/stats', { token: adminToken })
  assert(
    (statsAfterPending.data.pendingDepositsCount || 0) >= pendingBefore + 1,
    'admin stats show increased pending deposit count'
  )
  assert(
    statsAfterPending.data.deposits === depositsBefore,
    'completed Total Deposits unchanged while pending'
  )

  const txList = await api('/admin/transactions', { token: adminToken })
  const pendingDep = (txList.data.transactions || []).find(
    t => t.user_id === userId && t.type === 'deposit' && t.status === 'pending'
  )
  assert(pendingDep, 'pending deposit visible in admin transactions')

  const approve = await api(`/admin/transactions/${pendingDep.id}/action`, {
    method: 'POST',
    token: adminToken,
    body: { action: 'approve' },
  })
  assert(approve.status === 200, 'admin approves deposit')
  assert(
    Math.abs(approve.data.userBalance - depositAmount) < 0.01,
    'approve response returns updated user balance'
  )

  const statsAfterApprove = await api('/admin/stats', { token: adminToken })
  assert(
    statsAfterApprove.data.deposits >= depositsBefore + depositAmount - 0.01,
    'Total Deposits increases after approval'
  )
  assert(
    statsAfterApprove.data.walletBalance >= statsBefore.data.walletBalance + depositAmount - 0.01,
    'Platform wallet balance increases after approval'
  )

  const meAfter = await api('/auth/me', { token: userToken })
  assert(
    Math.abs((meAfter.data.wallet?.real_balance ?? 0) - depositAmount) < 0.01,
    'user wallet matches deposit after approval'
  )

  if (fs.existsSync(DB_PATH)) {
    const db = new DatabaseSync(DB_PATH)
    const row = db.prepare('SELECT real_balance FROM wallets WHERE user_id = ?').get(userId)
    assert(Math.abs((row?.real_balance ?? 0) - depositAmount) < 0.01, 'DB wallet row matches')
    const tx = db.prepare('SELECT status FROM transactions WHERE id = ?').get(pendingDep.id)
    assert(tx?.status === 'completed', 'DB transaction marked completed')
  } else {
    console.log('  ⚠ DB file not found — skipped direct DB assertions')
  }

  console.log('\nAll deposit ↔ admin integration checks passed')
}

main().catch((e) => {
  console.error('\n', e.message)
  process.exit(1)
})
