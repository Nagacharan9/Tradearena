import express from 'express'
import cors from 'cors'
import { WebSocketServer } from 'ws'
import http from 'http'
import { initDB } from './config/db.js'
import authRoutes from './routes/auth.js'
import tournamentRoutes from './routes/tournaments.js'
import tradeRoutes from './routes/trades.js'
import adminRoutes from './routes/admin.js'
import paymentsRoutes from './routes/payments.js'

import { startMarketEngine } from './services/marketEngine.js'
import { startBotEngine } from './services/botEngine.js'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Initialize Database
const db = initDB()

// Make db available to routes
app.use((req, res, next) => {
  req.db = db
  next()
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/tournaments', tournamentRoutes)
app.use('/api/trades', tradeRoutes)
app.use('/api/payments', paymentsRoutes)
app.use('/api/admin', adminRoutes)


// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

// HTTP Server
const server = http.createServer(app)

// WebSocket Server
const wss = new WebSocketServer({ server, path: '/ws' })

// Store connected clients by tournament
const tournamentClients = new Map()

wss.on('connection', (ws, req) => {
  console.log('🔌 WebSocket client connected')

  ws.isAlive = true
  ws.on('pong', () => { ws.isAlive = true })

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data)
      
      if (msg.type === 'join_tournament') {
        ws.tournamentId = msg.tournamentId
        ws.userId = msg.userId
        
        if (!tournamentClients.has(msg.tournamentId)) {
          tournamentClients.set(msg.tournamentId, new Set())
        }
        tournamentClients.get(msg.tournamentId).add(ws)
      }

      if (msg.type === 'chat_message') {
        // Broadcast to tournament
        broadcastToTournament(ws.tournamentId, {
          type: 'chat_message',
          userId: ws.userId,
          message: msg.message,
          timestamp: Date.now()
        })
      }
    } catch (e) {
      console.error('WS message error:', e)
    }
  })

  ws.on('close', () => {
    if (ws.tournamentId && tournamentClients.has(ws.tournamentId)) {
      tournamentClients.get(ws.tournamentId).delete(ws)
    }
  })
})

function broadcastToTournament(tournamentId, data) {
  const clients = tournamentClients.get(tournamentId)
  if (!clients) return
  const msg = JSON.stringify(data)
  clients.forEach(client => {
    if (client.readyState === 1) client.send(msg)
  })
}

// Broadcast price updates to all connected clients
function broadcastPrice(priceData) {
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type: 'price_update', ...priceData }))
    }
  })
}

// Broadcast leaderboard updates
function broadcastLeaderboard(tournamentId, leaderboard) {
  broadcastToTournament(tournamentId, {
    type: 'leaderboard_update',
    leaderboard
  })
}

// Heartbeat
const heartbeat = setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) return ws.terminate()
    ws.isAlive = false
    ws.ping()
  })
}, 30000)

wss.on('close', () => clearInterval(heartbeat))

// Start market engine
startMarketEngine(broadcastPrice)
startBotEngine(db)

// Market data endpoint (for chart initial load)
import { getCurrentPrice, getCandleHistory } from './services/marketEngine.js'
app.get('/api/market/price/:asset', (req, res) => {
  const asset = req.params.asset.replace('-', '/')
  res.json({ asset, price: getCurrentPrice(asset), timestamp: Date.now() })
})
app.get('/api/market/candles/:asset', (req, res) => {
  const asset = req.params.asset.replace('-', '/')
  res.json({ asset, candles: getCandleHistory(asset) })
})

// Serve static frontend in production
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../dist')
  app.use(express.static(distPath))
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/ws')) {
      res.sendFile(path.join(distPath, 'index.html'))
    }
  })
}

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ⚡ TradeArena Server running on port ${PORT}
  📊 WebSocket ready on ws://0.0.0.0:${PORT}/ws
  🗄️  Database initialized
  📈 Market engine started
  🌐 Mode: ${process.env.NODE_ENV || 'development'}
  `)
})

export { broadcastToTournament, broadcastLeaderboard }
