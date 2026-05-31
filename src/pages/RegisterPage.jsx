import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', referralCode: '' })
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: form, 2: OTP
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setError('')
    setLoading(true)
    try {
      // Request OTP
      const res = await api.requestRegisterOtp({ email: form.email })
      if (!res.success) throw new Error(res.message || 'Failed to send OTP')
      setStep(2) // Move to OTP verification
    } catch (err) {
      setError(err.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return // only digits
    if (value.length > 1) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    // Auto-advance focus
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus()
    }
  }

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus()
    }
  }

  // ✅ Auto-verify when all 6 digits are filled
  useEffect(() => {
    if (step === 2 && otp.every(d => d !== '')) {
      handleVerify()
    }
  }, [otp, step]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleVerify = async () => {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      // Verify OTP
      const otpValue = otp.join('')
      const res = await api.verifyRegisterOtp({ email: form.email, otp: otpValue })
      if (!res.success) throw new Error(res.message || 'Invalid OTP')
      
      // Register user
      const regRes = await api.register({
        username: form.username,
        email: form.email,
        password: form.password,
        referralCode: form.referralCode
      })
      await register(regRes.token, regRes.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Registration failed')
      setStep(1) // Go back to step 1 to fix fields
    } finally {
      setLoading(false)
    }
  }

  const resendOtp = () => {
    setOtp(['', '', '', '', '', ''])
    document.getElementById('otp-0')?.focus()
  }

  const passwordStrength = () => {
    const p = form.password
    if (!p) return { strength: 0, label: '', color: '' }
    let score = 0
    if (p.length >= 8) score++
    if (/[A-Z]/.test(p)) score++
    if (/[0-9]/.test(p)) score++
    if (/[^A-Za-z0-9]/.test(p)) score++
    const labels = ['', 'Weak', 'Fair', 'Strong', 'Very Strong']
    const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-accent-500', 'bg-accent-400']
    return { strength: score, label: labels[score], color: colors[score] }
  }

  const ps = passwordStrength()

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center relative overflow-hidden px-4 py-8">
      {/* Background */}
      <div className="absolute inset-0 bg-hero-gradient" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-accent-500/8 rounded-full blur-[128px]" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-gold-500/6 rounded-full blur-[128px]" />
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />

      <div className="relative w-full max-w-md animate-scale-in">
        <div className="glass-card p-8 sm:p-10">
          {/* Logo */}
          <Link to="/" className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-xl font-display font-bold">
              <span className="gradient-text">Trade</span><span className="text-white">Arena</span>
            </span>
          </Link>

          {step === 1 ? (
            <>
              <h1 className="text-2xl font-display font-bold text-white text-center mb-2">Create Account</h1>
              <p className="text-sm text-white/40 text-center mb-8">Join 156K+ traders competing for prizes</p>

              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-6">
                <div className="flex-1 h-1 rounded-full bg-primary-500" />
                <div className="flex-1 h-1 rounded-full bg-white/10" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1.5">Username</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="glass-input"
                    placeholder="AlphaTrader"
                    required
                    minLength={3}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="glass-input"
                    placeholder="trader@example.com"
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="glass-input pr-10"
                      placeholder="••••••••"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        {showPassword
                          ? <path d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" strokeLinecap="round" strokeLinejoin="round"/>
                          : <><path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"/></>
                        }
                      </svg>
                    </button>
                  </div>
                  {form.password && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= ps.strength ? ps.color : 'bg-white/10'}`} />
                        ))}
                      </div>
                      <span className="text-xs text-white/40">{ps.label}</span>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1.5">Confirm Password</label>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    className={`glass-input ${form.confirmPassword && form.password !== form.confirmPassword ? 'border-red-500/50' : ''}`}
                    placeholder="••••••••"
                    required
                  />
                  {form.confirmPassword && form.password !== form.confirmPassword && (
                    <p className="text-xs text-red-400 mt-1">Passwords don't match</p>
                  )}
                </div>

                {/* Referral Code */}
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1.5">
                    Referral Code <span className="text-white/20">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.referralCode}
                    onChange={(e) => setForm({ ...form, referralCode: e.target.value })}
                    className="glass-input"
                    placeholder="Enter code for bonus"
                  />
                </div>

                {error && (
                  <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={loading || (form.confirmPassword && form.password !== form.confirmPassword) || !form.username || !form.email || !form.password}
                  className="btn-primary w-full !py-3.5 text-base disabled:opacity-50 disabled:cursor-not-allowed !mt-6"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Sending OTP...
                    </span>
                  ) : 'Continue →'}
                </button>
              </form>

              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-white/30">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <button className="w-full py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-medium transition-all duration-300 flex items-center justify-center gap-3">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <p className="text-sm text-white/40 text-center mt-6">
                Already have an account?{' '}
                <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">Sign In</Link>
              </p>
            </>
          ) : (
            /* OTP Verification Step */
            <>
              <div className="flex items-center gap-2 mb-6">
                <div className="flex-1 h-1 rounded-full bg-primary-500" />
                <div className="flex-1 h-1 rounded-full bg-primary-500" />
              </div>

              <h1 className="text-2xl font-display font-bold text-white text-center mb-2">Verify Email</h1>
              <p className="text-sm text-white/40 text-center mb-2">
                We sent a 6-digit code to <span className="text-primary-400">{form.email}</span>
              </p>
              <p className="text-xs text-white/25 text-center mb-8">For demo purposes, enter any 6 digits</p>

              <div className="flex justify-center gap-3 mb-6">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(e, i)}
                    className={`w-12 h-14 text-center text-xl font-mono font-bold glass-input rounded-xl transition-all ${digit ? 'border-primary-500/50 bg-primary-500/5' : ''}`}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              {error && (
                <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 mb-4">
                  {error}
                </div>
              )}

              {loading && (
                <div className="text-center mb-4">
                  <div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-white/30 mt-2">Verifying...</p>
                </div>
              )}

              <button
                onClick={handleVerify}
                disabled={loading || otp.some(d => !d)}
                className="btn-primary w-full !py-3.5 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify & Create Account'}
              </button>

              <p className="text-sm text-white/40 text-center mt-4">
                Didn't receive code?{' '}
                <button onClick={resendOtp} className="text-primary-400 hover:text-primary-300 font-medium transition-colors">Resend</button>
              </p>
              <p className="text-sm text-white/30 text-center mt-2">
                <button onClick={() => setStep(1)} className="text-white/30 hover:text-white transition-colors text-xs">← Back to signup</button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
