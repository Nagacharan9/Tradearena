import { DatabaseSync } from 'node:sqlite'
import { v4 as uuid } from 'uuid'

try {
  const db = new DatabaseSync('C:/Users/maari/Desktop/Tournament/server/data/tradearena.db')
  
  const numCount = 1
  const min = 1000
  const max = 10000
  const tournamentId = 'b97c0c56-5825-4a82-b15a-cd1c6d56fde6' // newtest1 ID from earlier

  const realisticFirstNames = ['michael', 'emily']
  const realisticLastNames = ['smith', 'johnson']
  const countries = ['🇺🇸']

  db.prepare('BEGIN').run()
  let injected = 0
  for (let i = 0; i < numCount; i++) {
    const id = uuid()
    
    const firstName = realisticFirstNames[Math.floor(Math.random() * realisticFirstNames.length)]
    const lastName = realisticLastNames[Math.floor(Math.random() * realisticLastNames.length)]
    let name = `${firstName}_${lastName}`
    
    const balance = min + Math.random() * (max - min)
    const country = countries[0]

    // 1. Create puppet bot in DB
    db.prepare(`INSERT INTO bots (id, name, country, difficulty, aggression, win_ratio, chat_personality, is_puppet) VALUES (?,?,?,?,?,?,?,1)`)
      .run(id, name, country, 'high', 0.8, 0.6, 'aggressive')
    db.prepare(`INSERT INTO users (id, username, email, password, country, role) VALUES (?,?,?,?,?,?)`)
      .run(id, name, `bot_${id}@ta.local`, 'bot', country, 'bot')
      
    // 2. Add to tournament
    db.prepare(`INSERT INTO tournament_participants (id, tournament_id, user_id, balance) VALUES (?, ?, ?, ?)`)
      .run(uuid(), tournamentId, id, balance)
      
    injected++
  }
  
  db.prepare('UPDATE tournaments SET current_players = current_players + ? WHERE id = ?')
    .run(injected, tournamentId)
    
  db.prepare('COMMIT').run()
  console.log('Success!')
} catch (e) {
  console.error('Error:', e)
}
