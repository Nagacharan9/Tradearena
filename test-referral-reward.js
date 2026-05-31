import { spawn } from 'child_process';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { DatabaseSync } from 'node:sqlite';

async function runTests() {
  console.log("Preparing database for reward test...");
  const db = new DatabaseSync('server/data/tradearena.db');

  const referrerId = crypto.randomUUID();
  const referredId = crypto.randomUUID();
  const adminId = crypto.randomUUID();
  
  // Create Admin
  db.prepare(`
    INSERT INTO users (id, username, email, password, role) 
    VALUES (?, ?, ?, ?, 'admin')
  `).run(adminId, 'admin_reward_test', 'admin_reward_test@tradearena.com', bcrypt.hashSync('admin123', 10));

  // Create Referrer
  db.prepare(`
    INSERT INTO users (id, username, email, password, role) 
    VALUES (?, ?, ?, ?, 'user')
  `).run(referrerId, 'referrer_test_1', 'referrer_test_1@tradearena.com', bcrypt.hashSync('pass', 10));
  db.prepare('INSERT INTO wallets (id, user_id) VALUES (?, ?)').run(crypto.randomUUID(), referrerId);

  // Create Referred
  db.prepare(`
    INSERT INTO users (id, username, email, password, role, referred_by) 
    VALUES (?, ?, ?, ?, 'user', ?)
  `).run(referredId, 'referred_test_1', 'referred_test_1@tradearena.com', bcrypt.hashSync('pass', 10), referrerId);
  db.prepare('INSERT INTO wallets (id, user_id) VALUES (?, ?)').run(crypto.randomUUID(), referredId);

  // Create Referral Entry
  const referralId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO referrals (id, referrer_id, referred_id, reward_paid) 
    VALUES (?, ?, ?, 0)
  `).run(referralId, referrerId, referredId);

  // Create Pending Deposit for Referred User
  const txnId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO transactions (id, user_id, type, amount, status) 
    VALUES (?, ?, 'deposit', 50, 'pending')
  `).run(txnId, referredId);

  console.log("Starting server...");
  const server = spawn('node', ['server/src/app.js']);
  server.stdout.pipe(process.stdout);
  server.stderr.pipe(process.stderr);
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    // 1. Admin Login to get token
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin_reward_test@tradearena.com', password: 'admin123' })
    });
    const { token } = await loginRes.json();

    // 2. Approve Deposit
    console.log("Approving deposit...");
    const approveRes = await fetch(`http://localhost:3001/api/admin/transactions/${txnId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ action: 'approve' })
    });
    const approveData = await approveRes.json();
    console.log("Approve Data:", approveData);

    // 3. Verify Referrer Balance
    const referrerWallet = db.prepare('SELECT real_balance FROM wallets WHERE user_id = ?').get(referrerId);
    console.log(`Referrer Balance (Level 1 test): $${referrerWallet.real_balance}`);
    if (referrerWallet.real_balance === 1) {
      console.log("✅ Level 1 Reward works!");
    } else {
      console.log("❌ Level 1 Reward failed!");
    }

    // 4. Verify Transaction was created
    const rewardTxn = db.prepare("SELECT * FROM transactions WHERE user_id = ? AND type = 'referral_reward'").get(referrerId);
    if (rewardTxn) {
      console.log("✅ Reward Transaction works!");
    }

  } catch (e) {
    console.error("Test error:", e);
  } finally {
    server.kill();
    // Cleanup
    db.prepare('DELETE FROM transactions WHERE user_id IN (?, ?)').run(referredId, referrerId);
    db.prepare('DELETE FROM referrals WHERE id = ?').run(referralId);
    db.prepare('DELETE FROM wallets WHERE user_id IN (?, ?, ?)').run(referrerId, referredId, adminId);
    db.prepare('DELETE FROM users WHERE id IN (?, ?, ?)').run(referrerId, referredId, adminId);
    process.exit(0);
  }
}

runTests().catch(console.error);
