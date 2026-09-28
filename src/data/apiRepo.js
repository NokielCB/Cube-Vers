/**
 * apiRepo — implementacja repozytorium solve'ów i sesji oparta o backend (chmura).
 * Ten sam interfejs co localRepo. Backend zwraca już kanoniczny kształt
 * solve'a ({ id, time, scramble, status, createdAt, sessionId }), więc tylko przekazujemy.
 */
import { api } from '../lib/api'

export const apiRepo = {
  kind: 'api',

  /**
   * Cała historia usera. Serwer oddaje ją stronami (max 1000 na żądanie, żeby
   * jedno żądanie nie mogło urosnąć bez końca), a my dociągamy strony do końca —
   * statystyki, sesje i osiągnięcia liczą się z PEŁNEJ historii.
   */
  async getSolves() {
    const all = []
    let cursor = null
    do {
      const page = await api.getSolves(cursor)
      all.push(...page.solves)
      // Bezpiecznik: pusta strona kończy pętlę, nawet gdyby serwer oddał kursor.
      cursor = page.solves.length ? page.nextCursor : null
    } while (cursor)
    return all
  },

  async addSolve(payload) {
    return api.createSolve(payload)
  },

  // patch: { status } i/lub { sessionId } → zaktualizowany solve
  async updateSolve(id, patch) {
    return api.updateSolve(id, patch)
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

  // — sesje układania —
  async getSessions() {
    const { sessions } = await api.listSessions()
    return sessions
  },

  async createSession(name) {
    return api.createSession(name)
  },

  async renameSession(id, name) {
    return api.renameSession(id, name)
  },

  // Czasy usuniętej sesji serwer przenosi do „Głównej" (sessionId = null).
  async deleteSession(id) {
    return api.deleteSession(id)
  },

  // — postęp nauki algorytmów (statusy + rekordy z treningu) —
  // → { statuses: { algId: status }, pbs: { algId: { sekwencja: ms } } }
  async getProgress() {
    return api.getProgress()
  },

  async setAlgStatus(algId, status) {
    return api.setAlgStatus(algId, status)
  },

  // → { algId, moves, time } — rekord obowiązujący po zapisie (może być lepszy
  // od zgłoszonego, jeśli inne urządzenie ma już lepszy czas).
  async recordAlgPb(algId, moves, time) {
    return api.recordAlgPb({ algId, moves, time })
  },
}
