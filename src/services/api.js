const API_BASE = '/api'

class ApiService {
  constructor() {
    this.token = localStorage.getItem('tradearena_token')
  }

  setToken(token) {
    this.token = token
    localStorage.setItem('tradearena_token', token)
  }

  clearToken() {
    this.token = null
    localStorage.removeItem('tradearena_token')
  }

  async request(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json' }
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    })

    const text = await res.text()
    let data = {}
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(res.ok ? 'Invalid server response' : `Request failed (${res.status})`)
      }
    }
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
    return data
  }

  // Auth
  async register(data) {
    const res = await this.request('/auth/register', { method: 'POST', body: JSON.stringify(data) })
    this.setToken(res.token)
    return res
  }

  async requestRegisterOtp(data) {
    return this.request('/auth/register/request-otp', { method: 'POST', body: JSON.stringify(data) })
  }

  async verifyRegisterOtp(data) {
    return this.request('/auth/register/verify-otp', { method: 'POST', body: JSON.stringify(data) })
  }

  async login(data) {
    const res = await this.request('/auth/login', { method: 'POST', body: JSON.stringify(data) })
    this.setToken(res.token)
    return res
  }

  async getProfile() {
    return this.request('/auth/me')
  }

  async updateProfile(data) {
    return this.request('/auth/profile', { method: 'PATCH', body: JSON.stringify(data) })
  }

  async logout() {
    if (this.token) {
      try {
        await this.request('/auth/logout', { method: 'POST' })
      } catch (_) {}
    }
    this.clearToken()
  }

  // Tournaments
  async getTournaments() {
    return this.request('/tournaments')
  }

  async getTournament(id) {
    return this.request(`/tournaments/${id}`)
  }

  async getJoinedTournaments() {
    return this.request('/tournaments/joined')
  }

  async createTournament(data) {
    return this.request('/tournaments', { method: 'POST', body: JSON.stringify(data) })
  }

  async joinTournament(id) {
    return this.request(`/tournaments/${id}/join`, { method: 'POST' })
  }

  async getMyTournamentData(id) {
    return this.request(`/tournaments/${id}/my-data`)
  }

  // Trades
  async placeTrade(data) {
    return this.request('/trades', { method: 'POST', body: JSON.stringify(data) })
  }

  async settleTrade(tradeId, exitPrice) {
    return this.request(`/trades/${tradeId}/settle`, { method: 'POST', body: JSON.stringify({ exit_price: exitPrice }) })
  }

  async getTradeHistory(tournamentId) {
    return this.request(`/trades/history/${tournamentId}`)
  }

  // Wallet & Transactions
  async getTransactions() {
    return this.request('/auth/transactions')
  }

  async requestDeposit(amount, method, reference) {
    return this.request('/auth/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount, method, reference })
    })
  }

  async requestWithdrawal(amount, method, withdrawalDetails) {
    return this.request('/auth/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount, method, withdrawalDetails })
    })
  }

  async transferToTournamentBalance(amount) {
    return this.request('/auth/transfer', {
      method: 'POST',
      body: JSON.stringify({ amount })
    })
  }

  async requestPasswordReset(email) {
    return this.request('/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  async confirmPasswordReset(token, password) {
    return this.request('/auth/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    })
  }

  isLoggedIn() {
    return !!this.token
  }
}

export const api = new ApiService()
export default api
