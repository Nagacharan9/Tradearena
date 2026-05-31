import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

function Particle({ delay, size, left, duration }) {
  return (
    <div
      className="particle"
      style={{
        width: size,
        height: size,
        left: `${left}%`,
        background: `radial-gradient(circle, rgba(59,142,255,0.6) 0%, transparent 70%)`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    />
  )
}

export default function HeroSection() {
  const [liveCount, setLiveCount] = useState(0)

  useEffect(() => {
    fetch('/api/tournaments')
      .then(r => r.ok ? r.json() : { tournaments: [] })
      .then(d => {
        const n = (d.tournaments || []).filter(t => t.status === 'active').length
        setLiveCount(n)
      })
      .catch(() => setLiveCount(0))
  }, [])

  const particles = Array.from({ length: 30 }, (_, i) => ({
    delay: Math.random() * 15,
    size: Math.random() * 4 + 2,
    left: Math.random() * 100,
    duration: Math.random() * 10 + 10,
  }))

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Layers */}
      <div className="absolute inset-0 bg-hero-gradient" />
      <div className="absolute inset-0" style={{
        backgroundImage: `radial-gradient(circle at 20% 50%, rgba(59,142,255,0.08) 0%, transparent 50%),
                          radial-gradient(circle at 80% 20%, rgba(0,220,110,0.06) 0%, transparent 50%),
                          radial-gradient(circle at 50% 80%, rgba(255,189,32,0.04) 0%, transparent 50%)`
      }} />

      {/* Grid Overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />

      {/* Floating Particles */}
      {particles.map((p, i) => <Particle key={i} {...p} />)}

      {/* Animated Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-[128px] animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-500/10 rounded-full blur-[128px] animate-float" style={{ animationDelay: '3s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold-500/5 rounded-full blur-[200px]" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-24 pb-16">
        {/* Live Badge — only when real active tournaments exist */}
        {liveCount > 0 && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-500/10 border border-accent-500/20 mb-8 animate-fade-in">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-500"></span>
            </span>
            <span className="text-sm font-medium text-accent-400">
              {liveCount} tournament{liveCount !== 1 ? 's' : ''} live now
            </span>
          </div>
        )}

        {/* Headline */}
        <h1 className="font-display font-black text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight mb-6 animate-slide-up">
          <span className="block text-white">Trade.</span>
          <span className="block gradient-text">Compete.</span>
          <span className="block text-white">Dominate.</span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-white/50 leading-relaxed mb-10 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          Join the world's most intense trading tournaments. Compete against elite traders, 
          climb the leaderboard, and win <span className="text-gold-400 font-semibold">massive prize pools</span> in real-time competitions.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <Link to="/register" className="btn-gold text-lg !px-10 !py-4 group">
            <span className="relative z-10 flex items-center gap-2">
              Join Tournament
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </Link>
          <button className="px-10 py-4 rounded-xl text-lg font-medium text-white/70 border border-white/10 hover:border-white/30 hover:text-white hover:bg-white/5 transition-all duration-300 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Watch Demo
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto animate-slide-up" style={{ animationDelay: '0.45s' }}>
          {[
            { value: '$2.4M+', label: 'Prizes Awarded', color: 'text-gold-400' },
            { value: '156K+', label: 'Active Traders', color: 'text-primary-400' },
            { value: '8,420', label: 'Tournaments Held', color: 'text-accent-400' },
            { value: '99.9%', label: 'Uptime', color: 'text-white' },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-4 text-center">
              <div className={`text-2xl sm:text-3xl font-display font-bold ${stat.color} mb-1`}>{stat.value}</div>
              <div className="text-xs text-white/40">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-dark-950 to-transparent" />
    </section>
  )
}
