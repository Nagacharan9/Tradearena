import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfileAndTransactions = async () => {
    try {
      const profile = await api.getProfile()
      const txsRaw = await api.getTransactions()
      
      const txs = Array.isArray(txsRaw) ? txsRaw : []
      const mappedTxs = txs.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        method: t.method || '',
        date: t.created_at ? new Date(t.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
        status: t.status
      }))

      const fullUser = {
        ...profile.user,
        balance: profile.wallet?.real_balance ?? 0,
        tournament_balance: profile.wallet?.tournament_balance ?? 0,
        bonus_balance: profile.wallet?.bonus_balance ?? 0,
        preferred_currency: profile.user?.preferred_currency || localStorage.getItem('tradearena_currency') || 'USD',
        transactions: mappedTxs
      }

      if (fullUser.preferred_currency) {
        localStorage.setItem('tradearena_currency', fullUser.preferred_currency)
      }

      setUser(fullUser)
      localStorage.setItem('tradearena_user', JSON.stringify(fullUser))
      return fullUser
    } catch (e) {
      console.error('Failed to load profile from backend:', e)
      // Only logout if it's an auth error (401/403), not a network error
      if (e.message?.includes('Access denied') || e.message?.includes('Invalid token')) {
        void logout()
      }
      throw e
    }
  }

  // Load user from backend if token exists
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('tradearena_token')
      if (savedToken) {
        api.setToken(savedToken)
        try {
          await fetchProfileAndTransactions()
        } catch (e) {
          // If backend is down, try to use cached user
          const cached = localStorage.getItem('tradearena_user')
          if (cached) {
            try {
              setUser(JSON.parse(cached))
            } catch (_) {}
          }
        }
      }
      setLoading(false)
    }
    initAuth()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (token, _userData) => {
    api.setToken(token)
    await fetchProfileAndTransactions()
  }

  const register = async (token, _userData) => {
    api.setToken(token)
    await fetchProfileAndTransactions()
  }

  // Refresh balance/profile from backend
  const refreshUser = async () => {
    const savedToken = localStorage.getItem('tradearena_token')
    if (savedToken) {
      try {
        await fetchProfileAndTransactions()
      } catch (_) {}
    }
  }

  // ✅ Deposit request (requires admin approval)
  const deposit = async (amount, method = 'unknown', reference = '') => {
    try {
      await api.requestDeposit(amount, method, reference)
      await refreshUser()
    } catch (e) {
      console.error('Deposit request failed:', e)
      throw e
    }
  }

  // ✅ Withdrawal request (requires admin approval)
  const withdraw = async (amount, method = 'unknown', withdrawalDetails = null) => {
    try {
      await api.requestWithdrawal(amount, method, withdrawalDetails)
      await refreshUser()
    } catch (e) {
      console.error('Withdrawal request failed:', e)
      throw e
    }
  }

  // ✅ Update user profile fields locally
  const updateUser = (fields) => {
    setUser(prev => {
      const updated = { ...prev, ...fields }
      localStorage.setItem('tradearena_user', JSON.stringify(updated))
      return updated
    })
  }

  const logout = async () => {
    await api.logout()
    setUser(null)
    localStorage.removeItem('tradearena_user')
    localStorage.removeItem('tradearena_token')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, deposit, withdraw, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
