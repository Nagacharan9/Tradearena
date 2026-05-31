import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';

const db = new Database('./data/database.sqlite');
const numCount = 10;
const min = 1000;
const max = 10000;

const realisticFirstNames = ['michael', 'emily', 'chris', 'sarah', 'joshua', 'jessica', 'matthew', 'ashley', 'david', 'amanda', 'james', 'brittany', 'john', 'megan', 'robert', 'samantha', 'joseph', 'taylor', 'daniel', 'lauren', 'william', 'stephanie', 'alexander', 'nicole', 'richard', 'elizabeth']
const realisticLastNames = ['smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller', 'davis', 'rodriguez', 'martinez']
const countries = ['🇺🇸', '🇬🇧', '🇨🇦', '🇦🇺', '🇩🇪', '🇫🇷', '🇯🇵', '🇧🇷', '🇮🇳', '🇿🇦']

try {
  db.prepare('BEGIN').run()
  let injected = 0
  for (let i = 0; i < numCount; i++) {
    const id = uuid()
    
    const firstName = realisticFirstNames[Math.floor(Math.random() * realisticFirstNames.length)]
    const lastName = realisticLastNames[Math.floor(Math.random() * realisticLastNames.length)]
    const useNumber = Math.random() > 0.5
    const num = useNumber ? Math.floor(Math.random() * 999) : ''
    let baseName = `${firstName}${useNumber ? '_' : ''}${num || (Math.random() > 0.5 ? lastName.charAt(0) : '')}`
    
    let name = baseName
    while (db.prepare('SELECT id FROM users WHERE username = ?').get(name)) {
      name = `${baseName}${Math.floor(Math.random() * 10000)}`
    }

    const balance = min + Math.random() * (max - min)
    const country = countries[Math.floor(Math.random() * countries.length)]

    console.log("Inserting bot:", name, country);
    
    db.prepare(`INSERT INTO bots (id, name, country, difficulty, aggression, win_ratio, chat_personality, is_puppet) VALUES (?,?,?,?,?,?,?,1)`)
      .run(id, name, country, 'high', 0.8, 0.6, 'aggressive')
    db.prepare(`INSERT INTO users (id, username, email, password, country, role) VALUES (?,?,?,?,?,?)`)
      .run(id, name, `${name.toLowerCase().replace(/[^a-z0-9]/g,'')}@ta.local`, 'bot', country, 'bot')
      
    // fake tournament id for testing
    // db.prepare(`INSERT INTO tournament_participants (id, tournament_id, user_id, balance) VALUES (?, ?, ?, ?)`)
    //   .run(uuid(), 'test-tourney', id, balance)
      
    injected++
  }
  db.prepare('ROLLBACK').run()
  console.log("Success, injected:", injected)
} catch (err) {
  db.prepare('ROLLBACK').run()
  console.error("Error:", err.message)
}
