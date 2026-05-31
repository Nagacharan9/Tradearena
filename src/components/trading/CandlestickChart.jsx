import { useEffect, useRef, useState, useCallback } from 'react'

// Generates realistic candle data for a given asset
function generateCandles(count = 100, basePrice = 67500) {
  const candles = []
  let price = basePrice + Math.random() * 500
  const now = Math.floor(Date.now() / 1000)

  for (let i = count; i > 0; i--) {
    const time = now - i * 5
    const open = price
    const change = (Math.random() - 0.48) * (basePrice * 0.001)
    const close = open + change
    const high = Math.max(open, close) + Math.random() * (basePrice * 0.0005)
    const low = Math.min(open, close) - Math.random() * (basePrice * 0.0005)
    candles.push({ time, open, high, low, close })
    price = close
  }
  return candles
}

// Base prices per asset
const ASSET_PRICES = {
  'BTC/USD': 67500,
  'ETH/USD': 3800,
  'EUR/USD': 1.085,
  'GBP/USD': 1.265,
  'GOLD/USD': 2350,
  'GBP/JPY': 195,
}

export default function CandlestickChart({ asset = 'BTC/USD', onPriceUpdate }) {
  const containerRef = useRef(null)
  const chartInstance = useRef(null)
  const seriesRef = useRef(null)
  const candlesRef = useRef(null)
  const onPriceUpdateRef = useRef(onPriceUpdate)
  const [currentPrice, setCurrentPrice] = useState(0)
  const [priceChange, setPriceChange] = useState(0)
  const [priceChangeOpen, setPriceChangeOpen] = useState(0)
  const [timeframe, setTimeframe] = useState('5m')
  const [chartReady, setChartReady] = useState(false)

  // Keep ref updated without causing re-renders
  useEffect(() => {
    onPriceUpdateRef.current = onPriceUpdate
  }, [onPriceUpdate])

  // Init chart — runs once per mount
  useEffect(() => {
    let chart, series
    const basePrice = ASSET_PRICES[asset] || 67500
    candlesRef.current = generateCandles(100, basePrice)

    const initChart = async () => {
      try {
        const { createChart } = await import('lightweight-charts')

        if (!containerRef.current) return

        chart = createChart(containerRef.current, {
          autoSize: true,
          layout: {
            background: { color: 'transparent' },
            textColor: 'rgba(255,255,255,0.4)',
            fontFamily: 'Inter, system-ui',
            fontSize: 11,
          },
          grid: {
            vertLines: { color: 'rgba(255,255,255,0.03)' },
            horzLines: { color: 'rgba(255,255,255,0.03)' },
          },
          crosshair: {
            vertLine: { color: 'rgba(59,142,255,0.3)', width: 1, style: 2 },
            horzLine: { color: 'rgba(59,142,255,0.3)', width: 1, style: 2 },
          },
          rightPriceScale: {
            borderColor: 'rgba(255,255,255,0.05)',
            scaleMargins: { top: 0.1, bottom: 0.1 },
          },
          timeScale: {
            borderColor: 'rgba(255,255,255,0.05)',
            timeVisible: true,
            secondsVisible: false,
          },
          handleScroll: { mouseWheel: true, pressedMouseMove: true },
          handleScale: { mouseWheel: true, pinch: true },
        })

        series = chart.addCandlestickSeries({
          upColor: '#00dc6e',
          downColor: '#ef4444',
          borderUpColor: '#00dc6e',
          borderDownColor: '#ef4444',
          wickUpColor: '#00dc6e',
          wickDownColor: '#ef4444',
        })

        series.setData(candlesRef.current)
        chart.timeScale().fitContent()

        chartInstance.current = chart
        seriesRef.current = series

        const lastCandle = candlesRef.current[candlesRef.current.length - 1]
        setCurrentPrice(lastCandle.close)
        setPriceChange(lastCandle.close - lastCandle.open)
        setPriceChangeOpen(lastCandle.open)
        onPriceUpdateRef.current?.(lastCandle.close)
        setChartReady(true)

      } catch (err) {
        console.error('Chart init error:', err)
      }
    }

    initChart()

    return () => {
      if (chartInstance.current) {
        try { chartInstance.current.remove() } catch {}
        chartInstance.current = null
        seriesRef.current = null
      }
    }
  }, [asset]) // reinit when asset changes

  // ✅ Live price updates — use ref for callback to avoid recreating interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (!seriesRef.current || !candlesRef.current) return

      const candles = candlesRef.current
      const lastCandle = candles[candles.length - 1]
      const basePrice = ASSET_PRICES[asset] || 67500
      const vol = basePrice * 0.001
      const bias = (Math.random() - 0.48) * vol * 0.3
      const change = (Math.random() - 0.5) * vol + bias

      const now = Math.floor(Date.now() / 1000)
      const lastTime = lastCandle.time

      if (now - lastTime >= 5) {
        // New candle
        const open = lastCandle.close
        const close = open + change
        const high = Math.max(open, close) + Math.random() * (vol * 0.4)
        const low = Math.min(open, close) - Math.random() * (vol * 0.4)
        const newCandle = { time: now, open, high, low, close }
        candlesRef.current.push(newCandle)
        if (candlesRef.current.length > 500) candlesRef.current.shift()
        seriesRef.current.update(newCandle)
        setCurrentPrice(close)
        setPriceChange(close - open)
        setPriceChangeOpen(open)
        onPriceUpdateRef.current?.(close)
      } else {
        // Update current candle tick
        const updated = { ...lastCandle }
        updated.close = updated.close + change * 0.1
        updated.high = Math.max(updated.high, updated.close)
        updated.low = Math.min(updated.low, updated.close)
        candlesRef.current[candlesRef.current.length - 1] = updated
        seriesRef.current.update(updated)
        setCurrentPrice(updated.close)
        setPriceChange(updated.close - updated.open)
        setPriceChangeOpen(updated.open)
        onPriceUpdateRef.current?.(updated.close)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [asset]) // only dep is asset (no onPriceUpdate in deps — use ref instead)

  const isUp = priceChange >= 0
  const pctChange = priceChangeOpen !== 0
    ? ((priceChange / Math.abs(priceChangeOpen)) * 100).toFixed(3)
    : '0.000'

  // Format price based on asset type (forex needs 5 decimal places)
  const isForex = ['EUR/USD', 'GBP/USD', 'GBP/JPY'].includes(asset)
  const formatPrice = (p) => isForex ? p.toFixed(5) : `$${p.toFixed(2)}`
  const formatChange = (p) => isForex ? Math.abs(p).toFixed(5) : `$${Math.abs(p).toFixed(2)}`

  return (
    <div className="flex flex-col h-full">
      {/* Chart Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gold-500/20 flex items-center justify-center text-sm font-bold text-gold-400">
              {asset.split('/')[0][0]}
            </div>
            <div>
              <div className="text-sm font-bold text-white">{asset}</div>
              <div className="text-[10px] text-white/30">
                {chartReady ? 'Live' : 'Connecting...'} •
                <span className={`ml-1 inline-block w-1.5 h-1.5 rounded-full align-middle ${chartReady ? 'bg-accent-500 animate-pulse' : 'bg-white/20'}`} />
              </div>
            </div>
          </div>
          <div>
            <div className={`text-xl font-mono font-bold ${isUp ? 'text-accent-400' : 'text-red-400'}`}>
              {currentPrice > 0 ? formatPrice(currentPrice) : '—'}
            </div>
            <div className={`text-xs font-mono ${isUp ? 'text-accent-400' : 'text-red-400'}`}>
              {currentPrice > 0 ? `${isUp ? '▲' : '▼'} ${formatChange(priceChange)} (${pctChange}%)` : 'Loading...'}
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          {['1m', '5m', '15m', '1H', '4H'].map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${timeframe === tf ? 'bg-primary-500/20 text-primary-400' : 'text-white/30 hover:text-white/60'}`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      {/* Chart Area — autoSize fills this container */}
      <div ref={containerRef} className="flex-1 min-h-0" style={{ minHeight: '200px' }} />
    </div>
  )
}
