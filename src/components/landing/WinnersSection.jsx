const WINNERS = [
  { rank: 1, name: 'AlphaTrader99', country: '🇺🇸', prize: 12500, tournament: 'Weekly Championship', winRate: '78%', avatar: 'AT' },
  { rank: 2, name: 'CryptoWolf', country: '🇬🇧', prize: 8200, tournament: 'Diamond Challenge', winRate: '72%', avatar: 'CW' },
  { rank: 3, name: 'ForexQueen', country: '🇯🇵', prize: 6800, tournament: 'Masters Sprint', winRate: '69%', avatar: 'FQ' },
  { rank: 4, name: 'BullRunner', country: '🇩🇪', prize: 4500, tournament: 'Crypto Legends', winRate: '65%', avatar: 'BR' },
  { rank: 5, name: 'SilentSniper', country: '🇮🇳', prize: 3200, tournament: 'Night Owl Showdown', winRate: '63%', avatar: 'SS' },
]

const RANK_COLORS = {
  1: 'from-gold-400 to-gold-600',
  2: 'from-slate-300 to-slate-500',
  3: 'from-orange-400 to-orange-600',
}

export default function WinnersSection() {
  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-dark-950 via-accent-950/5 to-dark-950 pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-gold-400 mb-3">
            Hall of Fame
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
            Top <span className="gradient-text-gold">Winners</span>
          </h2>
          <p className="max-w-xl mx-auto text-white/40">
            These elite traders dominated their tournaments. Will you be next?
          </p>
        </div>

        {/* Winners List */}
        <div className="max-w-3xl mx-auto space-y-3">
          {WINNERS.map((winner, index) => (
            <div 
              key={winner.rank}
              className={`glass-card-hover p-4 flex items-center gap-4 animate-slide-up ${
                winner.rank <= 3 ? 'border-gold-400/20' : ''
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Rank */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display font-black text-lg ${
                winner.rank <= 3 
                  ? `bg-gradient-to-br ${RANK_COLORS[winner.rank]} text-dark-950` 
                  : 'bg-white/5 text-white/40'
              }`}>
                {winner.rank}
              </div>

              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                winner.rank === 1 ? 'bg-gold-500/20 text-gold-400 ring-2 ring-gold-400/30' :
                winner.rank === 2 ? 'bg-slate-400/20 text-slate-300 ring-2 ring-slate-400/30' :
                winner.rank === 3 ? 'bg-orange-500/20 text-orange-400 ring-2 ring-orange-400/30' :
                'bg-white/10 text-white/60'
              }`}>
                {winner.avatar}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white truncate">{winner.name}</span>
                  <span className="text-lg">{winner.country}</span>
                </div>
                <div className="text-xs text-white/30">{winner.tournament}</div>
              </div>

              {/* Win Rate */}
              <div className="hidden sm:block text-right">
                <div className="text-xs text-white/30">Win Rate</div>
                <div className="text-sm font-bold text-accent-400">{winner.winRate}</div>
              </div>

              {/* Prize */}
              <div className="text-right">
                <div className="text-xs text-white/30">Won</div>
                <div className={`text-lg font-display font-bold ${winner.rank === 1 ? 'text-gold-400 neon-text-gold' : 'text-white'}`}>
                  ${winner.prize.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
