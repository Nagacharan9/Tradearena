// Bot Engine — Simulates AI traders in tournaments

import { v4 as uuid } from 'uuid'

const BOT_NAMES = [
  'AlphaWolf', 'CryptoKing', 'SilentSniper', 'BullRider', 'BearHunter',
  'NeonTrader', 'GoldFinch', 'ShadowFX', 'IronChart', 'SwiftTrade',
  'DeepValue', 'MoonShot', 'ScalpMaster', 'TrendKing', 'DayBreaker',
  'NightHawk', 'QuantBot', 'FlashTrader', 'PipHunter', 'CandlePro',
  'WaveRider', 'ChartNinja', 'ForexFox', 'CoinSniper', 'RiskRunner',
]

const BOT_COUNTRIES = ['🇺🇸', '🇬🇧', '🇯🇵', '🇩🇪', '🇫🇷', '🇰🇷', '🇸🇬', '🇦🇺', '🇨🇦', '🇧🇷', '🇮🇳', '🇹🇷', '🇳🇱', '🇪🇸', '🇮🇹']

const BOT_DIFFICULTY = {
  low: { winRate: 0.35, tradeFreq: 15000, maxTradePercent: 0.03 },
  medium: { winRate: 0.50, tradeFreq: 10000, maxTradePercent: 0.05 },
  high: { winRate: 0.62, tradeFreq: 7000, maxTradePercent: 0.08 },
  elite: { winRate: 0.75, tradeFreq: 5000, maxTradePercent: 0.12 },
}

let botIntervals = []

function getTargetBotCount(tournament) {
  const maxPlayers = Math.max(0, Number(tournament.max_players) || 0)
  const minBots = Math.max(0, Number(tournament.bot_min) || 0)
  const maxBots = Math.max(minBots, Number(tournament.bot_max) || 0)

  if (maxBots === 0) return 0

  const cappedMin = Math.min(minBots, maxPlayers)
  const cappedMax = Math.min(maxBots, maxPlayers)
  if (cappedMax <= cappedMin) return cappedMin

  return Math.floor(cappedMin + Math.random() * (cappedMax - cappedMin + 1))
}

export function startBotEngine(db) {
  // Check for active tournaments with bots every 10 seconds
  setInterval(() => {
    try {
      const activeTournaments = db.prepare(`
        SELECT * FROM tournaments WHERE status = 'active' AND bot_enabled = 1
      `).all()

      activeTournaments.forEach(tournament => {
        const botCount = db.prepare(`
          SELECT COUNT(*) as count FROM tournament_participants 
          WHERE tournament_id = ? AND is_bot = 1
        `).get(tournament.id)

        const targetBots = getTargetBotCount(tournament)
        const openSlots = Math.max(0, (Number(tournament.max_players) || 0) - (Number(tournament.current_players) || 0))
        if (targetBots > 0 && botCount.count < targetBots && openSlots > 0) {
          const botsToAdd = Math.min(5, targetBots - botCount.count, openSlots)
          for (let i = 0; i < botsToAdd; i++) {
            addBotToTournament(db, tournament)
          }
        }
      })
    } catch (e) {
      // Silently handle DB errors during startup
    }
  }, 10000)

  console.log('🤖 Bot engine started')
}

function addBotToTournament(db, tournament) {
  const botId = uuid()
  const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)] + Math.floor(Math.random() * 999)
  const country = BOT_COUNTRIES[Math.floor(Math.random() * BOT_COUNTRIES.length)]

  // Create bot user if not exists
  try {
    db.prepare(`
      INSERT OR IGNORE INTO bots (id, name, country, difficulty, aggression, win_ratio, chat_personality, is_puppet)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).run(botId, name, country, tournament.bot_difficulty || 'medium', 0.6, 0.5, 'silent')

    db.prepare(`
      INSERT OR IGNORE INTO users (id, username, email, password, country, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(botId, name, `${name.toLowerCase()}@bot.tradearena.com`, 'bot', country, 'bot')

    db.prepare(`
      INSERT INTO tournament_participants (id, tournament_id, user_id, balance, is_bot)
      VALUES (?, ?, ?, ?, 1)
    `).run(uuid(), tournament.id, botId, tournament.tournament_balance)

    db.prepare('UPDATE tournaments SET current_players = current_players + 1 WHERE id = ?')
      .run(tournament.id)
  } catch (e) {
    // Ignore duplicate errors
  }
}

export function simulateBotTrade(db, tournamentId, difficulty = 'medium') {
  const config = BOT_DIFFICULTY[difficulty] || BOT_DIFFICULTY.medium

  const bots = db.prepare(`
    SELECT tp.*, u.username FROM tournament_participants tp
    JOIN users u ON tp.user_id = u.id
    WHERE tp.tournament_id = ? AND tp.is_bot = 1
  `).all(tournamentId)

  bots.forEach(bot => {
    if (Math.random() > 0.3) return // Not every bot trades every cycle

    const tradeAmount = bot.balance * (Math.random() * config.maxTradePercent)
    if (tradeAmount < 1 || bot.balance < tradeAmount) return

    const won = Math.random() < config.winRate
    const profitLoss = won ? tradeAmount * 0.85 : -tradeAmount

    if (won) {
      db.prepare('UPDATE tournament_participants SET balance = balance + ?, win_count = win_count + 1, trade_count = trade_count + 1, profit_loss = profit_loss + ? WHERE id = ?')
        .run(tradeAmount * 0.85, profitLoss, bot.id)
    } else {
      db.prepare('UPDATE tournament_participants SET balance = balance - ?, loss_count = loss_count + 1, trade_count = trade_count + 1, profit_loss = profit_loss + ? WHERE id = ?')
        .run(tradeAmount, profitLoss, bot.id)
    }
  })
}
