import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'

export default function ResetPasswordPage() {
  const { token: tokenParam } = useParams()
  const navigate = useNavigate()

  const [step, setStep] = useState(tokenParam ? 'reset' : 'request')
  const [email, setEmail] = useState('')
  const [token, setToken] = useState(tokenParam || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [devResetUrl, setDevResetUrl] = useState('')

  useEffect(() => {
    if (tokenParam) {
      setToken(tokenParam)
      setStep('reset')
    }
  }, [tokenParam])

  const passwordsMatch = useMemo(() => {
    if (!password || !confirmPassword) return true
    return password === confirmPassword
  }, [password, confirmPassword])

  const requestReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    setDevResetUrl('')

    try {
      const res = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to request reset')

      setMessage(data.message || 'If that email exists, a reset link has been generated.')
      if (data.resetUrl) setDevResetUrl(data.resetUrl)
      if (data.resetToken) {
        setToken(data.resetToken)
        setStep('reset')
      }
    } catch (err) {
      setError(err.message || 'Failed to request reset')
    } finally {
      setLoading(false)
    }
  }

  const confirmReset = async (e) => {
    e.preventDefault()
    if (!passwordsMatch) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const res = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to reset password')

      setMessage(data.message || 'Password updated successfully')
      setTimeout(() => navigate('/login'), 1200)
    } catch (err) {
      setError(err.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center relative overflow-hidden px-4 py-8">
      <div className="absolute inset-0 bg-hero-gradient" />
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-[128px]" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-500/8 rounded-full blur-[128px]" />

      <div className="relative w-full max-w-md animate-scale-in">
        <div className="glass-card p-8 sm:p-10">
          <Link to="/" className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-xl font-display font-bold">
              <span className="gradient-text">Trade</span><span className="text-white">Arena</span>
            </span>
          </Link>

          <h1 className="text-2xl font-display font-bold text-white text-center mb-2">
            {step === 'request' ? 'Reset Password' : 'Set New Password'}
          </h1>
          <p className="text-sm text-white/40 text-center mb-8">
            {step === 'request'
              ? 'We will generate a reset link for your account'
              : 'Enter the token and your new password'}
          </p>

          {message && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-accent-500/10 border border-accent-500/20 text-xs text-accent-300">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              {error}
            </div>
          )}

          {devResetUrl && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-primary-500/10 border border-primary-500/20 text-xs text-primary-300 break-all">
              Dev reset link: <Link className="underline" to={devResetUrl}>{devResetUrl}</Link>
            </div>
          )}

          {step === 'request' ? (
            <form onSubmit={requestReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input"
                  placeholder="trader@example.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full !py-3.5 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Generating reset link...' : 'Send Reset Link'}
              </button>
            </form>
          ) : (
            <form onSubmit={confirmReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1.5">Reset Token</label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="glass-input font-mono"
                  placeholder="Paste reset token"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/60 mb-1.5">New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input"
                  placeholder="New password"
                  minLength={8}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/60 mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`glass-input ${confirmPassword && !passwordsMatch ? 'border-red-500/50' : ''}`}
                  placeholder="Confirm password"
                  minLength={8}
                  required
                />
                {confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !passwordsMatch}
                className="btn-primary w-full !py-3.5 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating password...' : 'Update Password'}
              </button>

              <button
                type="button"
                onClick={() => setStep('request')}
                className="w-full text-xs text-primary-400 hover:text-primary-300 transition-colors"
              >
                ← Back to request form
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-white/40 hover:text-white transition-colors">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
