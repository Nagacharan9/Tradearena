import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled 
        ? 'bg-dark-950/80 backdrop-blur-xl border-b border-white/5 shadow-glass' 
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-neon-blue group-hover:shadow-neon-green transition-all duration-500">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 blur-lg opacity-50 group-hover:opacity-80 transition-opacity duration-500" />
            </div>
            <span className="text-xl font-display font-bold">
              <span className="gradient-text">Trade</span>
              <span className="text-white">Arena</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {['Tournaments', 'Leaderboard', 'Prizes', 'How it Works'].map((item) => (
              <a 
                key={item} 
                href={`#${item.toLowerCase().replace(/\s/g, '-')}`}
                className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-300"
              >
                {item}
              </a>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <Link to="/login" className="px-5 py-2.5 text-sm font-medium text-white/80 hover:text-white border border-white/10 hover:border-white/30 rounded-xl transition-all duration-300 hover:bg-white/5">
              Sign In
            </Link>
            <Link to="/register" className="btn-primary text-sm !px-5 !py-2.5">
              Start Competing
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden relative w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"
          >
            <div className="flex flex-col gap-1.5">
              <span className={`w-5 h-0.5 bg-white rounded-full transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`w-5 h-0.5 bg-white rounded-full transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`w-5 h-0.5 bg-white rounded-full transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </div>
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={`lg:hidden transition-all duration-500 overflow-hidden ${menuOpen ? 'max-h-80 pb-4' : 'max-h-0'}`}>
          <div className="flex flex-col gap-1 pt-2">
            {['Tournaments', 'Leaderboard', 'Prizes', 'How it Works'].map((item) => (
              <a 
                key={item} 
                href={`#${item.toLowerCase().replace(/\s/g, '-')}`}
                onClick={() => setMenuOpen(false)}
                className="px-4 py-3 text-sm font-medium text-white/60 hover:text-white rounded-xl hover:bg-white/5 transition-all duration-300"
              >
                {item}
              </a>
            ))}
            <div className="flex gap-3 mt-2 px-4">
              <Link to="/login" className="flex-1 text-center py-2.5 text-sm border border-white/10 rounded-xl text-white/80 hover:bg-white/5 transition-all">Sign In</Link>
              <Link to="/register" className="flex-1 text-center btn-primary text-sm !px-4 !py-2.5">Compete</Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
