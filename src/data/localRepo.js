/**
 * localRepo — implementacja repozytorium solve'ów i sesji oparta o localStorage.
 * Używana w TRYBIE GOŚCIA. Ma dokładnie ten sam interfejs co apiRepo:
 *   getSolves, addSolve, updateSolve, deleteSolve, clearAll, getAnalytics,
 *   getSessions, createSession, renameSession, deleteSession
 * (+ exportAll / exportSessions / clear do migracji Gościa → konto).
 * Dzięki temu reszta apki nie wie, że dane siedzą w przeglądarce.
 *
 * Kanoniczny kształt solve'a: { id, time, scramble, status, createdAt, sessionId }.
 * Kanoniczny kształt sesji:   { id, name, createdAt }. sessionId null = „Główna".
 */
import { computeAnalytics } from './analyticsLocal'

const KEY = 'cubeverse_guest_solves'
const SESSIONS_KEY = 'cubeverse_guest_sessions'
const MAX_SESSIONS = 50 // ten sam limit co na serwerze

function readList(key) {
  try {
    const raw = localStorage.getItem(key)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

const read = () => readList(KEY)
const readSessions = () => readList(SESSIONS_KEY)

function write(list) {
  localStorage.setItem(KEY, JSON.stringify(list))
}

function writeSessions(list) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(list))
}

function uid() {
  return crypto?.randomUUID?.() ?? `g_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export const localRepo = {
  kind: 'local',

  async getSolves() {
    return read() // trzymamy od najnowszego
  },

  async addSolve({ time, scramble = 'unrecorded', status = 'OK', sessionId = null }) {
    const solve = {
      id: uid(),
      time: Math.round(time),
      scramble,
      status,
      createdAt: new Date().toISOString(),
      sessionId,
    }
    write([solve, ...read()])
    return solve
  },

  // Tak jak PATCH na serwerze: zmieniamy wyłącznie karę i/lub sesję.
  async updateSolve(id, { status, sessionId }) {
    let updated = null
    const list = read().map((s) => {
      if (s.id !== id) return s
      updated = {
        ...s,
        ...(status !== undefined && { status }),
        ...(sessionId !== undefined && { sessionId }),
      }
      return updated
    })
    if (!updated) throw new Error('Nie znaleziono ułożenia.')
    write(list)
    return updated
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

  // — sesje układania —
  async getSessions() {
    return readSessions()
  },

  async createSession(name) {
    const list = readSessions()
    if (list.length >= MAX_SESSIONS) throw new Error(`Osiągnięto limit ${MAX_SESSIONS} sesji.`)
    const session = { id: uid(), name, createdAt: new Date().toISOString() }
    writeSessions([...list, session])
    return session
  },

  async renameSession(id, name) {
    let updated = null
    writeSessions(readSessions().map((s) => (s.id === id ? (updated = { ...s, name }) : s)))
    if (!updated) throw new Error('Nie znaleziono sesji.')
    return updated
  },

  // Jak SetNull w bazie: czasy usuwanej sesji wracają do „Głównej".
  async deleteSession(id) {
    writeSessions(readSessions().filter((s) => s.id !== id))
    write(read().map((s) => (s.sessionId === id ? { ...s, sessionId: null } : s)))
    return { ok: true }
  },

  // — pomocnicze do migracji Gościa → chmura —
  exportAll() {
    return read()
  },
  exportSessions() {
    return readSessions()
  },
  clear() {
    localStorage.removeItem(KEY)
    localStorage.removeItem(SESSIONS_KEY)
  },
}
