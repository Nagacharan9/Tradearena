import { useState, useEffect, useRef } from 'react'

const BOT_MESSAGES = [
  { name: 'CryptoKing', country: '🇬🇧', msg: 'BTC about to pump, going all in! 🚀', personality: 'hype' },
  { name: 'SilentSniper', country: '🇯🇵', msg: 'Patience wins tournaments.', personality: 'expert' },
  { name: 'BullRunner', country: '🇮🇳', msg: 'Just hit a 5-win streak! Lets gooo', personality: 'aggressive' },
  { name: 'NeonTrader', country: '🇧🇷', msg: 'This volatility is insane 😱', personality: 'fearful' },
  { name: 'WaveRider', country: '🇦🇺', msg: 'Top 3 incoming, watch out 😤', personality: 'toxic' },
  { name: 'ChartNinja', country: '🇰🇷', msg: 'RSI showing overbought, careful', personality: 'expert' },
  { name: 'GoldFinch', country: '🇫🇷', msg: 'Who else is down bad rn? 😂', personality: 'hype' },
  { name: 'FlashTrader', country: '🇺🇸', msg: 'Small consistent wins > big gambles', personality: 'expert' },
]

export default function TournamentChat({ tournamentId }) {
  const [messages, setMessages] = useState([
    { id: 1, name: 'Admin', country: '⚡', msg: '🏆 Tournament has started! Good luck traders!', isAdmin: true, time: '2m ago' },
  ])
  const [input, setInput] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const chatEndRef = useRef(null)

  // Simulate bot messages
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.5) {
        const bot = BOT_MESSAGES[Math.floor(Math.random() * BOT_MESSAGES.length)]
        setMessages(prev => [...prev, { id: Date.now(), name: bot.name, country: bot.country, msg: bot.msg, time: 'now' }])
      }
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return
    setMessages(prev => [...prev, { id: Date.now(), name: 'You', country: '🌍', msg: input, isUser: true, time: 'now' }])
    setInput('')
  }

  const EMOJIS = ['🚀', '🔥', '💰', '📈', '📉', '😱', '🎯', '💎', '🏆', '👀', '😤', '🤑']

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-xs font-bold text-white flex items-center gap-1.5">💬 Chat <span className="text-white/20">({messages.length})</span></h3>
        <span className="flex items-center gap-1 text-[10px] text-accent-400"><span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse"/>Live</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {messages.map(m => (
          <div key={m.id} className={`${m.isAdmin ? 'bg-gold-500/5 border border-gold-500/10 rounded-lg px-2 py-1.5' : m.isUser ? 'bg-primary-500/5 rounded-lg px-2 py-1.5' : ''}`}>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-[10px]">{m.country}</span>
              <span className={`text-[11px] font-bold ${m.isAdmin ? 'text-gold-400' : m.isUser ? 'text-primary-400' : 'text-white/60'}`}>{m.name}</span>
              {m.isAdmin && <span className="text-[8px] px-1 py-0 rounded bg-gold-500/20 text-gold-400 font-bold">ADMIN</span>}
              <span className="text-[9px] text-white/15 ml-auto">{m.time}</span>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">{m.msg}</p>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Emoji Picker */}
      {showEmoji && (
        <div className="px-3 py-2 border-t border-white/5 flex flex-wrap gap-1">
          {EMOJIS.map(e => (
            <button key={e} onClick={() => { setInput(prev => prev + e); setShowEmoji(false) }} className="w-7 h-7 rounded hover:bg-white/10 text-sm transition-all flex items-center justify-center">{e}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-3 py-2 border-t border-white/5 flex gap-2">
        <button onClick={() => setShowEmoji(!showEmoji)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-sm hover:bg-white/10 transition-all shrink-0">😀</button>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          className="flex-1 bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/20 outline-none focus:border-primary-500/30"
          placeholder="Type a message..."
        />
        <button onClick={handleSend} className="w-8 h-8 rounded-lg bg-primary-500/20 text-primary-400 flex items-center justify-center hover:bg-primary-500/30 transition-all shrink-0 text-xs font-bold">→</button>
      </div>
    </div>
  )
}
