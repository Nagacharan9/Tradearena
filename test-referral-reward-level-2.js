import { spawn } from 'child_process';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { DatabaseSync } from 'node:sqlite';

async function runTests() {
  console.log("Preparing database for level 2 reward test...");
  const db = new DatabaseSync('server/data/tradearena.db');

  const referrerId = crypto.randomUUID();
  const referredId = crypto.randomUUID();
  const adminId = crypto.randomUUID();
  
  // Create Admin
  db.prepare(`
    INSERT INTO users (id, username, email, password, role) 
    VALUES (?, ?, ?, ?, 'admin')
  `).run(adminId, 'admin_reward_l2', 'admin_reward_l2@tradearena.com', bcrypt.hashSync('admin123', 10));

  // Create Referrer
  db.prepare(`
    INSERT INTO users (id, username, email, password, role) 
    VALUES (?, ?, ?, ?, 'user')
  `).run(referrerId, 'referrer_l2', 'referrer_l2@tradearena.com', bcrypt.hashSync('pass', 10));
  db.prepare('INSERT INTO wallets (id, user_id) VALUES (?, ?)').run(crypto.randomUUID(), referrerId);

  // Insert 25 ALREADY PAID referrals to trigger Level 2
  for(let i=0; i<25; i++) {
    const dummyRefId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO referrals (id, referrer_id, referred_id, reward_paid) 
      VALUES (?, ?, ?, 1)
    `).run(crypto.randomUUID(), referrerId, dummyRefId);
  }

  // Create New Referred User
  db.prepare(`
    INSERT INTO users (id, username, email, password, role, referred_by) 
    VALUES (?, ?, ?, ?, 'user', ?)
  `).run(referredId, 'referred_l2', 'referred_l2@tradearena.com', bcrypt.hashSync('pass', 10), referrerId);
  db.prepare('INSERT INTO wallets (id, user_id) VALUES (?, ?)').run(crypto.randomUUID(), referredId);

  // Create NEW Referral Entry (Unpaid)
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
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin_reward_l2@tradearena.com', password: 'admin123' })
    });
    const { token } = await loginRes.json();

    console.log("Approving deposit...");
    await fetch(`http://localhost:3001/api/admin/transactions/${txnId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ action: 'approve' })
    });

    const referrerWallet = db.prepare('SELECT real_balance FROM wallets WHERE user_id = ?').get(referrerId);
    console.log(`Referrer Balance (Level 2 test): $${referrerWallet.real_balance}`);
    
    if (referrerWallet.real_balance === 2) {
      console.log("✅ Level 2 Reward works!");
    } else {
      console.log("❌ Level 2 Reward failed!");
    }

  } catch (e) {
    console.error("Test error:", e);
  } finally {
    server.kill();
    // Cleanup
    db.prepare('DELETE FROM transactions WHERE user_id IN (?, ?)').run(referredId, referrerId);
    db.prepare('DELETE FROM referrals WHERE referrer_id = ?').run(referrerId);
    db.prepare('DELETE FROM wallets WHERE user_id IN (?, ?, ?)').run(referrerId, referredId, adminId);
    db.prepare('DELETE FROM users WHERE id IN (?, ?, ?)').run(referrerId, referredId, adminId);
    process.exit(0);
  }
}

runTests().catch(console.error);
