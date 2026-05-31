// Market Engine — Generates realistic price data with admin manipulation support

let currentPrices = {
  'BTC/USD': 67500 + Math.random() * 1000,
  'ETH/USD': 3450 + Math.random() * 100,
  'EUR/USD': 1.0850 + Math.random() * 0.005,
  'GBP/USD': 1.2720 + Math.random() * 0.005,
  'GOLD/USD': 2340 + Math.random() * 20,
  'GBP/JPY': 191.50 + Math.random() * 1,
}

let marketMode = 'balanced' // bull, bear, chaos, balanced, manual
let volatilityMultiplier = 1.0
let trendDirection = 0 // -1 bear, 0 neutral, +1 bull

const VOLATILITY = {
  'BTC/USD': 50,
  'ETH/USD': 8,
  'EUR/USD': 0.0005,
  'GBP/USD': 0.0005,
  'GOLD/USD': 3,
  'GBP/JPY': 0.15,
}

const candleHistory = {}
Object.keys(currentPrices).forEach(asset => {
  candleHistory[asset] = generateInitialCandles(asset, 100)
})

function generateInitialCandles(asset, count) {
  const candles = []
  let price = currentPrices[asset]
  const vol = VOLATILITY[asset]
  const now = Date.now()
  
  for (let i = count; i > 0; i--) {
    const time = Math.floor((now - i * 5000) / 1000)
    const open = price
    const change = (Math.random() - 0.5) * vol * 2
    const close = open + change
    const high = Math.max(open, close) + Math.random() * vol * 0.5
    const low = Math.min(open, close) - Math.random() * vol * 0.5
    
    candles.push({ time, open, high, low, close })
    price = close
  }
  
  currentPrices[asset] = price
  return candles
}

function generateNextCandle(asset) {
  const vol = VOLATILITY[asset] * volatilityMultiplier
  const price = currentPrices[asset]
  
  let bias = 0
  switch (marketMode) {
    case 'bull': bias = vol * 0.3; break
    case 'bear': bias = -vol * 0.3; break
    case 'chaos': bias = (Math.random() - 0.5) * vol * 2; break
    case 'manual': bias = trendDirection * vol * 0.5; break
    default: bias = (Math.random() - 0.5) * vol * 0.1
  }

  const change = (Math.random() - 0.5) * vol * 2 + bias
  const open = price
  const close = price + change
  const high = Math.max(open, close) + Math.random() * vol * 0.3
  const low = Math.min(open, close) - Math.random() * vol * 0.3
  const time = Math.floor(Date.now() / 1000)

  currentPrices[asset] = close
  
  const candle = { time, open, high, low, close }
  
  if (!candleHistory[asset]) candleHistory[asset] = []
  candleHistory[asset].push(candle)
  if (candleHistory[asset].length > 500) candleHistory[asset].shift()

  return candle
}

export function startMarketEngine(broadcastPrice) {
  // Generate new candles every 2 seconds
  setInterval(() => {
    Object.keys(currentPrices).forEach(asset => {
      const candle = generateNextCandle(asset)
      broadcastPrice({
        asset,
        candle,
        price: candle.close,
        timestamp: Date.now()
      })
    })
  }, 2000)

  console.log('📈 Market engine started — 6 assets, 2s intervals')
}

export function getCurrentPrice(asset) {
  return currentPrices[asset] || 0
}

export function getCandleHistory(asset) {
  return candleHistory[asset] || []
}

export function setMarketMode(mode) {
  marketMode = mode
  console.log(`📊 Market mode changed to: ${mode}`)
}

export function setVolatility(multiplier) {
  volatilityMultiplier = multiplier
}

export function setTrendDirection(dir) {
  trendDirection = dir
}

export { currentPrices }
