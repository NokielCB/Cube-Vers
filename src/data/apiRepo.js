/**
 * apiRepo — implementacja repozytorium solve'ów oparta o backend (chmura).
 * Ten sam interfejs co localRepo. Backend zwraca już kanoniczny kształt
 * solve'a ({ id, time, scramble, status, createdAt }), więc tylko przekazujemy.
 */
import { api } from '../lib/api'

export const apiRepo = {
  kind: 'api',

  async getSolves() {
    const { solves } = await api.getSolves()
    return solves
  },

  async addSolve(payload) {
    return api.createSolve(payload)
  },

  async deleteSolve(id) {
    return api.deleteSolve(id)
  },

  // Kasuje całą historię w chmurze — trasa chroniona JWT, userId z tokenu.
  async clearAll() {
    return api.clearSolves()
  },

  async getAnalytics() {
    return api.getAnalytics()
  },
}
