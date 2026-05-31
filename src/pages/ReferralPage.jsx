import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ReferralPage() {
  const { user } = useAuth()
  const referralCode = user?.referral_code || user?.username?.toUpperCase()?.slice(0, 6) + Math.random().toString(36).slice(2, 5).toUpperCase() || 'INVITE'
  const [copied, setCopied] = useState(false)
  const referrals = [] // Will be fetched from API

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://tradearena.io/register?ref=${referralCode}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <header className="bg-dark-900/80 backdrop-blur-xl border-b border-white/5 px-4 lg:px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link to="/dashboard" className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
          <h1 className="text-xl font-display font-bold text-white">🤝 Referral Program</h1>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8 space-y-6">
        {/* Referral Link Card */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-display font-bold text-white mb-2">Your Referral Link</h3>
          <p className="text-xs text-white/30 mb-4">Share your link and earn commissions on every referred player</p>
          <div className="flex gap-2">
            <div className="flex-1 glass-input !py-2 text-sm font-mono text-white/60 truncate">
              https://tradearena.io/register?ref={referralCode}
            </div>
            <button onClick={handleCopy} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${copied ? 'bg-accent-500/20 text-accent-400' : 'btn-primary !py-2'}`}>
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
          </div>
        </div>

        {/* Commission Tiers */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-display font-bold text-white mb-4">💰 Commission Tiers</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { tier: 'Level 1', rate: '10%', desc: 'Direct referrals', color: 'text-accent-400', bg: 'bg-accent-500/10' },
              { tier: 'Level 2', rate: '5%', desc: 'Their referrals', color: 'text-primary-400', bg: 'bg-primary-500/10' },
              { tier: 'Level 3', rate: '2%', desc: 'Third level', color: 'text-gold-400', bg: 'bg-gold-500/10' },
            ].map(t => (
              <div key={t.tier} className={`p-4 rounded-xl ${t.bg} border border-white/5 text-center`}>
                <div className={`text-2xl font-display font-bold ${t.color}`}>{t.rate}</div>
                <div className="text-sm font-bold text-white mt-1">{t.tier}</div>
                <div className="text-xs text-white/30">{t.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-display font-bold text-white">{referrals.length}</div>
            <div className="text-xs text-white/30">Total Referrals</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-display font-bold text-accent-400">$0.00</div>
            <div className="text-xs text-white/30">Total Earned</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-display font-bold text-primary-400">0</div>
            <div className="text-xs text-white/30">Active Players</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-display font-bold text-gold-400">$0.00</div>
            <div className="text-xs text-white/30">Pending</div>
          </div>
        </div>

        {/* Referral List */}
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5">
            <h3 className="text-sm font-display font-bold text-white">Your Referrals</h3>
          </div>
          <div className="text-center py-10">
            <div className="text-3xl mb-2">🤝</div>
            <p className="text-sm text-white/30">No referrals yet</p>
            <p className="text-xs text-white/15">Share your link to start earning commissions</p>
          </div>
        </div>
      </div>
    </div>
  )
}
