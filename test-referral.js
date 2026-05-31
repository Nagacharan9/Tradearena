import { spawn } from 'child_process';
import crypto from 'crypto';
import { DatabaseSync } from 'node:sqlite';

async function runTests() {
  console.log("Starting server...");
  const server = spawn('node', ['server/src/app.js']);
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 3000));

  const db = new DatabaseSync('server/data/tradearena.db');

  const referrerUniqueId = crypto.randomUUID().slice(0, 8);
  const referrerUsername = `referrer_${referrerUniqueId}`;
  const referrerEmail = `${referrerUsername}@tradearena.com`;

  const referredUniqueId = crypto.randomUUID().slice(0, 8);
  const referredUsername = `referred_${referredUniqueId}`;
  const referredEmail = `${referredUsername}@tradearena.com`;

  let referrerReferralCode = '';

  try {
    // 1. Register Referrer
    console.log("Registering Referrer...");
    const regRes1 = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: referrerUsername, email: referrerEmail, password: 'password123' })
    });
    const data1 = await regRes1.json();
    referrerReferralCode = data1.user.referral_code;
    console.log(`Referrer registered with code: ${referrerReferralCode}`);

    // 2. Register Referred User with the Referrer's Code
    console.log(`Registering Referred User using code: ${referrerReferralCode}...`);
    const regRes2 = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: referredUsername, 
        email: referredEmail, 
        password: 'password123',
        referralCode: referrerReferralCode
      })
    });
    const data2 = await regRes2.json();
    console.log(`Referred User registered.`);

    // 3. Verify in DB
    const referrerRecord = db.prepare('SELECT id, referral_code FROM users WHERE email = ?').get(referrerEmail);
    const referredRecord = db.prepare('SELECT id, referred_by FROM users WHERE email = ?').get(referredEmail);
    
    console.log("\n--- DB Verification ---");
    console.log(`Referrer ID: ${referrerRecord.id}`);
    console.log(`Referred By field on Referred User: ${referredRecord.referred_by}`);
    
    const referralEntry = db.prepare('SELECT * FROM referrals WHERE referrer_id = ? AND referred_id = ?').get(referrerRecord.id, referredRecord.id);
    console.log("Referrals Table Entry:", referralEntry);
    
    if (referredRecord.referred_by === referrerRecord.id && referralEntry) {
      console.log("\n✅ Referral system test passed: Link successfully established in DB.");
    } else {
      console.log("\n❌ Referral system test failed: Link not found in DB.");
    }

  } catch (e) {
    console.error("Test error:", e);
  } finally {
    server.kill();
    // Cleanup
    db.prepare('DELETE FROM referrals WHERE referred_id IN (SELECT id FROM users WHERE email = ? OR email = ?)').run(referrerEmail, referredEmail);
    db.prepare('DELETE FROM wallets WHERE user_id IN (SELECT id FROM users WHERE email = ? OR email = ?)').run(referrerEmail, referredEmail);
    db.prepare('DELETE FROM users WHERE email = ? OR email = ?').run(referrerEmail, referredEmail);
    process.exit(0);
  }
}

runTests().catch(console.error);
