/**
 * localRepo — implementacja repozytorium solve'ów oparta o localStorage.
 * Używana w TRYBIE GOŚCIA. Ma dokładnie ten sam interfejs co apiRepo:
 *   getSolves, addSolve, deleteSolve, getAnalytics, exportAll, clear
 * Dzięki temu reszta apki nie wie, że dane siedzą w przeglądarce.
 *
 * Kanoniczny kształt solve'a: { id, time, scramble, status, createdAt }.
 */
import { computeAnalytics } from './analyticsLocal'

const KEY = 'cubeverse_guest_solves'

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function write(list) {
  localStorage.setItem(KEY, JSON.stringify(list))
}

function uid() {
  return crypto?.randomUUID?.() ?? `g_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export const localRepo = {
  kind: 'local',

  async getSolves() {
    return read() // trzymamy od najnowszego
  },

  async addSolve({ time, scramble = 'unrecorded', status = 'OK' }) {
    const solve = { id: uid(), time: Math.round(time), scramble, status, createdAt: new Date().toISOString() }
    write([solve, ...read()])
    return solve
  },

  async deleteSolve(id) {
    write(read().filter((s) => s.id !== id))
    return { ok: true }
  },

  // Kasuje CAŁĄ lokalną historię Gościa — usuwa klucz z localStorage.
  // Ten sam interfejs co apiRepo.clearAll(), więc DataContext nie rozróżnia trybu.
  async clearAll() {
    localStorage.removeItem(KEY)
    return { ok: true }
  },

  async getAnalytics() {
    return computeAnalytics(read())
  },

  // — pomocnicze do migracji Gościa → chmura —
  exportAll() {
    return read()
  },
  clear() {
    localStorage.removeItem(KEY)
  },
}
