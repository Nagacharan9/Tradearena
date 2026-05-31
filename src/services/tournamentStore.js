// Tournament Store — API-first; no fake demo tournaments

const STORAGE_KEY = 'tradearena_tournaments'

function isLegacyDemo(t) {
  if (!t?.id) return false
  return String(t.id).startsWith('default_')
}

class TournamentStore {
  getLocal() {
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      return all.filter(t => !isLegacyDemo(t))
    } catch {
      return []
    }
  }

  _saveLocal(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.filter(t => !isLegacyDemo(t))))
  }

  /** Strip old demo entries from localStorage once */
  _purgeLegacyDemos() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return
      const cleaned = parsed.filter(t => !isLegacyDemo(t))
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned))
      }
    } catch (_) {}
  }

  async getAll() {
    this._purgeLegacyDemos()
    try {
      const token = localStorage.getItem('tradearena_token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await fetch('/api/tournaments', { headers, cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        const apiTournaments = data.tournaments || (Array.isArray(data) ? data : [])
        // Also merge local tournaments created before the server response exists.
        // Important: keep status field from server so "active" shows in UI.
        const local = this.getLocal()
        const localAdminCreated = local.filter(
          t => String(t.id).startsWith('t_') || String(t.id).startsWith('admin_')
        )
        const apiIds = new Set(apiTournaments.map(t => String(t.id)))
        const extraLocal = localAdminCreated.filter(t => !apiIds.has(String(t.id)))
        const merged = [...apiTournaments, ...extraLocal]
        return merged
      }

    } catch (_) {}
    return this.getLocal()
  }

  async create(tournament) {
    const newTournament = {
      id: 't_' + Date.now(),
      ...tournament,
      current_players: 0,
      status: tournament.status || 'upcoming',
      created_at: new Date().toISOString(),
    }

    try {
      const token = localStorage.getItem('tradearena_token')
      const prizeSplit = {}
      ;(tournament.prizes || []).forEach(p => { prizeSplit[String(p.rank)] = p.percentage })

      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: tournament.title,
          asset: tournament.asset,
          entry_fee: tournament.entry_fee,
          prize_pool: tournament.prize_pool,
          duration_minutes: tournament.duration_minutes,
          tournament_balance: tournament.starting_balance,
          starting_balance: tournament.starting_balance,
          max_players: tournament.max_players,
          tier: tournament.tier,
          status: tournament.status,
          bot_enabled: tournament.bot_enabled !== false,
          bot_difficulty: tournament.bot_difficulty,
          bot_min: tournament.bot_min,
          bot_max: tournament.bot_max,
          prize_split: prizeSplit,
          prizes: tournament.prizes,
          start_time: tournament.start_time ? new Date(tournament.start_time).toISOString() : new Date().toISOString(),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        return data.tournament || data || newTournament
      }
    } catch (_) {}

    const local = this.getLocal()
    local.push(newTournament)
    this._saveLocal(local)
    return newTournament
  }

  async getById(id) {
    const all = await this.getAll()
    return all.find(t => String(t.id) === String(id)) || null
  }

  delete(id) {
    const local = this.getLocal()
    this._saveLocal(local.filter(t => String(t.id) !== String(id)))
  }

  updateStatus(id, status) {
    const local = this.getLocal()
    const idx = local.findIndex(t => String(t.id) === String(id))
    if (idx !== -1) {
      local[idx].status = status
      this._saveLocal(local)
    }
  }

  incrementPlayers(id) {
    const local = this.getLocal()
    const idx = local.findIndex(t => String(t.id) === String(id))
    if (idx !== -1) {
      local[idx].current_players = (local[idx].current_players || 0) + 1
      this._saveLocal(local)
    }
  }

   async join(id) {
     try {
       const token = localStorage.getItem('tradearena_token')
       if (!token) throw new Error('Not logged in')
       const res = await fetch(`/api/tournaments/${id}/join`, {
         method: 'POST',
         headers: { Authorization: `Bearer ${token}` },
       })
       const data = await res.json()
       if (!res.ok) {
         if (data.error === 'Already joined') return { success: true, alreadyJoined: true }
         throw new Error(data.error || 'Failed to join tournament')
       }
       // Update local storage with the latest tournament data if it exists there
       // For API-created tournaments, they may not be in local storage permanently,
       // but we should update them if they are present (e.g., locally created tournaments)
       const local = this.getLocal()
       const idx = local.findIndex(t => String(t.id) === String(id))
       if (idx !== -1) {
         // Merge the returned data with existing local data, preferring API data for consistency
         // Also increment the player count since we just joined
         local[idx] = { ...local[idx], ...data, current_players: (local[idx].current_players || 0) + 1 }
         this._saveLocal(local)
       } else {
         // If not in local storage, at least increment the player count if we can find it
         // This handles the case where the tournament was created via API but happens to be in local storage
         this.incrementPlayers(id)
       }
       return data
     } catch (e) {
       if (e.message === 'Already joined') return { success: true, alreadyJoined: true }
       throw e
     }
   }
}

export const tournamentStore = new TournamentStore()
export default tournamentStore
