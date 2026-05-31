import { Link } from 'react-router-dom'

const FEATURES = [
  {
    title: 'Real-Time Trading',
    desc: 'Institutional-grade candlestick charts with 50+ indicators. Execute trades with millisecond precision.',
    icon: '📊',
  },
  {
    title: 'Multiple Assets',
    desc: 'Trade Forex, Crypto, Commodities, and Synthetic assets. New markets added weekly.',
    icon: '🌐',
  },
  {
    title: 'Instant Payouts',
    desc: 'Winners get paid immediately. Withdraw via Crypto, UPI, Stripe, or bank transfer.',
    icon: '⚡',
  },
  {
    title: 'Fair Competition',
    desc: 'Advanced anti-cheat systems ensure every tournament is fair and transparent.',
    icon: '🛡️',
  },
  {
    title: 'Referral Rewards',
    desc: 'Earn $1 for every friend who joins a paid tournament. Unlimited referral potential.',
    icon: '🤝',
  },
  {
    title: 'Achievement System',
    desc: 'Unlock badges, climb ranks, and show off your trading legacy on your profile.',
    icon: '🏆',
  },
]

const TESTIMONIALS = [
  { name: 'Marcus R.', country: '🇺🇸', text: "The rush of climbing the leaderboard in real-time is unmatched. I've won 3 tournaments this month alone!", rating: 5 },
  { name: 'Yuki T.', country: '🇯🇵', text: "Finally a platform that combines competitive gaming with trading. The prize pools are insane.", rating: 5 },
  { name: 'Anil K.', country: '🇮🇳', text: "Clean interface, fast execution, and the tournaments are genuinely fun. Best platform I've used.", rating: 5 },
]

export default function FeaturesTestimonialsSection() {
  return (
    <>
      {/* Features Grid */}
      <section id="prizes" className="relative py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary-400 mb-3">
              Why TradeArena
            </span>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
              Built for <span className="gradient-text">Champions</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="glass-card-hover p-6 group animate-slide-up" style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="text-3xl mb-4 group-hover:scale-110 transition-transform duration-300">{f.icon}</div>
                <h3 className="text-lg font-display font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Referral Banner */}
      <section className="relative py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-card overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-accent-500/10 via-primary-500/10 to-gold-500/10" />
            <div className="relative p-8 sm:p-12 flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl sm:text-3xl font-display font-bold text-white mb-3">
                  Refer Friends, <span className="gradient-text-gold">Earn Cash</span>
                </h3>
                <p className="text-white/40 mb-1">Get <span className="text-gold-400 font-bold">$1</span> for every friend who joins a paid tournament.</p>
                <p className="text-white/40">Climb referral ranks: <span className="text-orange-400">Bronze</span> → <span className="text-slate-300">Silver</span> → <span className="text-gold-400">Gold</span> → <span className="text-primary-400">Diamond</span></p>
              </div>
              <Link to="/register" className="btn-gold !px-8 !py-3.5 whitespace-nowrap">
                Get Your Referral Link
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-gold-400 mb-3">
              Testimonials
            </span>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
              Loved by <span className="gradient-text-gold">Traders</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {TESTIMONIALS.map((t, i) => (
              <div key={t.name} className="glass-card-hover p-6 animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: t.rating }, (_, i) => (
                    <span key={i} className="text-gold-400">★</span>
                  ))}
                </div>
                <p className="text-sm text-white/60 leading-relaxed mb-4 italic">"{t.text}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-xs font-bold text-white">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{t.name}</div>
                    <div className="text-xs text-white/30">{t.country} Verified Trader</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-500/5 rounded-full blur-[200px]" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-gold-500/5 rounded-full blur-[150px]" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-6xl font-display font-black text-white mb-6">
            Ready to <span className="gradient-text">Dominate?</span>
          </h2>
          <p className="text-lg text-white/40 mb-10">
            Join 156,000+ traders competing for millions in prizes. Your first tournament is just a click away.
          </p>
          <Link to="/register" className="btn-gold text-lg !px-12 !py-4 inline-flex items-center gap-3">
            Start Competing Now
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <p className="text-xs text-white/20 mt-4">Free to join • No credit card required • Instant access</p>
        </div>
      </section>
    </>
  )
}
