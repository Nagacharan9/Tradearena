import { spawn } from 'child_process';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { DatabaseSync } from 'node:sqlite';

async function runTests() {
  console.log("Preparing database...");
  const db = new DatabaseSync('server/data/tradearena.db');
  
  // Create a unique test user directly in DB
  const uniqueId = crypto.randomUUID().slice(0, 8);
  const testEmail = `testuser_${uniqueId}@tradearena.com`;
  const testUsername = `testuser_${uniqueId}`;
  const testPass = 'testuser123';
  const hashedPass = bcrypt.hashSync(testPass, 10);
  const userId = crypto.randomUUID();
  
  db.prepare(`
    INSERT INTO users (id, username, email, password, role, session_version)
    VALUES (?, ?, ?, ?, 'user', 0)
  `).run(userId, testUsername, testEmail, hashedPass);
  
  db.prepare(`
    INSERT INTO wallets (id, user_id) VALUES (?, ?)
  `).run(crypto.randomUUID(), userId);

  console.log("Starting server...");
  const server = spawn('node', ['server/src/app.js']);
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 3000));

  const results = [];
  
  async function testLogin(name, email, password, expectSuccess) {
    console.log(`Testing ${name}...`);
    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      
      const success = response.ok && !!data.token;
      const passed = (expectSuccess && success) || (!expectSuccess && !success);
      
      results.push({
        test: name,
        email,
        expected: expectSuccess ? 'Success' : 'Failure',
        actual: success ? 'Success' : 'Failure',
        passed: passed,
        message: passed ? 'Passed' : `Failed. Response: ${JSON.stringify(data)}`
      });
    } catch (e) {
      results.push({
        test: name,
        email,
        expected: expectSuccess ? 'Success' : 'Failure',
        actual: 'Error',
        passed: false,
        message: e.message
      });
    }
  }

  // 1. Test Admin Login
  await testLogin('Admin Login', 'admin@tradearena.com', 'admin123', true);

  // 2. Test Invalid Admin Login
  await testLogin('Invalid Admin Login', 'admin@tradearena.com', 'wrongpass', false);

  // 3. Test Normal User Login
  await testLogin('Normal User Login', testEmail, testPass, true);

  // 4. Test Invalid Normal User Login
  await testLogin('Invalid Normal User Login', testEmail, 'wrong', false);

  console.log("\n--- TEST RESULTS ---");
  console.table(results);

  // Stop the server
  server.kill();
  
  const fs = await import('fs');
  fs.writeFileSync('login-test-results.json', JSON.stringify(results, null, 2));
  console.log("Results written to login-test-results.json");
  
  // Cleanup
  db.prepare('DELETE FROM wallets WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  
  process.exit(results.every(r => r.passed) ? 0 : 1);
}

runTests().catch(console.error);
