export default function HowItWorksSection() {
  const steps = [
    {
      step: '01',
      title: 'Create Account',
      desc: 'Sign up in seconds with email or Google. Verify your identity and get ready to trade.',
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      color: 'from-primary-500 to-primary-700',
      glow: 'shadow-neon-blue',
    },
    {
      step: '02',
      title: 'Join a Tournament',
      desc: 'Browse active competitions, pay the entry fee, and receive your tournament trading balance.',
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-5.54 0" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      color: 'from-accent-500 to-accent-700',
      glow: 'shadow-neon-green',
    },
    {
      step: '03',
      title: 'Trade & Compete',
      desc: 'Execute trades on real-time charts. Predict price movements and outperform your rivals.',
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      color: 'from-gold-500 to-gold-700',
      glow: 'shadow-neon-gold',
    },
    {
      step: '04',
      title: 'Win Prizes',
      desc: 'Finish in the top ranks and claim your share of the prize pool. Withdraw instantly.',
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      color: 'from-purple-500 to-purple-700',
      glow: 'shadow-[0_0_15px_rgba(168,85,247,0.5)]',
    },
  ]

  return (
    <section id="how-it-works" className="relative py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-accent-400 mb-3">
            Getting Started
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="max-w-xl mx-auto text-white/40">
            From signup to payout in four simple steps.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div key={s.step} className="glass-card-hover p-6 text-center group animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
              {/* Step Number */}
              <div className="text-xs font-mono text-white/20 mb-4">{s.step}</div>
              
              {/* Icon */}
              <div className={`w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-5 text-white transition-all duration-500 group-hover:${s.glow} group-hover:scale-110`}>
                {s.icon}
              </div>

              {/* Text */}
              <h3 className="text-lg font-display font-bold text-white mb-2">{s.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{s.desc}</p>

              {/* Connector Line */}
              {i < 3 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px bg-gradient-to-r from-white/10 to-transparent" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
