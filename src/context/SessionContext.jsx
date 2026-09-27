import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

/**
 * SessionContext — sesje układania + metadane pojedynczych czasów, trzymane
 * PO STRONIE KLIENTA (localStorage). Nakłada się „na wierzch" na kanoniczne
 * solve'y z DataContext, więc działa identycznie dla Gościa i zalogowanego,
 * BEZ ruszania backendu.
 *
 *  - sessions   — lista sesji [{ id, name }]; „Główna" (id: 'default') jest zawsze
 *                 i nie da się jej usunąć (to worek na czasy sprzed sesji).
 *  - activeId   — która sesja jest aktywna (do niej trafiają nowe czasy),
 *  - meta       — { [solveId]: { sessionId, status } }; status ∈ 'OK' | 'DNF' | '+2'.
 *
 * Czas BEZ wpisu w `meta` (np. historyczny) należy do sesji 'default' i ma
 * status 'OK' — dlatego stara historia nie znika po wprowadzeniu sesji.
 */

const SESSIONS_KEY = 'cubeverse_sessions'
const ACTIVE_KEY = 'cubeverse_active_session'
const META_KEY = 'cubeverse_solve_meta'

const DEFAULT_SESSION = { id: 'default', name: 'Główna' }

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function uid() {
  return crypto?.randomUUID?.() ?? `s_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  // Sesje: gwarantujemy obecność „Głównej" na pierwszym miejscu.
  const [sessions, setSessions] = useState(() => {
    const list = load(SESSIONS_KEY, null)
    if (!Array.isArray(list) || list.length === 0) return [DEFAULT_SESSION]
    return list.some((s) => s.id === 'default') ? list : [DEFAULT_SESSION, ...list]
  })
  const [activeId, setActiveId] = useState(() => load(ACTIVE_KEY, DEFAULT_SESSION.id) || DEFAULT_SESSION.id)
  const [meta, setMeta] = useState(() => load(META_KEY, {}) || {})

  // Trwałość: każda zmiana → zapis do localStorage.
  useEffect(() => void localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions)), [sessions])
  useEffect(() => void localStorage.setItem(ACTIVE_KEY, JSON.stringify(activeId)), [activeId])
  useEffect(() => void localStorage.setItem(META_KEY, JSON.stringify(meta)), [meta])

  // Aktualne activeId dla `tagSolve` wołanego z domknięcia (App.addSolve) —
  // ref omija „stary" activeId, gdyby callback był zapamiętany.
  const activeRef = useRef(activeId)
  useEffect(() => void (activeRef.current = activeId), [activeId])

  const addSession = useCallback((name) => {
    const clean = (name || '').trim() || 'Nowa sesja'
    const s = { id: uid(), name: clean }
    setSessions((prev) => [...prev, s])
    setActiveId(s.id) // od razu przełączamy na nową sesję
    return s
  }, [])

  const renameSession = useCallback((id, name) => {
    const clean = (name || '').trim()
    if (!clean) return
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, name: clean } : s)))
  }, [])

  const removeSession = useCallback((id) => {
    if (id === 'default') return // „Głównej" nie usuwamy
    setSessions((prev) => prev.filter((s) => s.id !== id))
    // Czasy z usuwanej sesji wracają do „Głównej", żeby nie zniknęły.
    setMeta((prev) => {
      const next = { ...prev }
      for (const k of Object.keys(next)) {
        if (next[k]?.sessionId === id) next[k] = { ...next[k], sessionId: 'default' }
      }
      return next
    })
    setActiveId((cur) => (cur === id ? 'default' : cur))
  }, [])

  // Nowy czas → przypnij do aktywnej sesji (jeśli jeszcze nie ma wpisu).
  const tagSolve = useCallback((solveId) => {
    setMeta((prev) =>
      prev[solveId] ? prev : { ...prev, [solveId]: { sessionId: activeRef.current, status: 'OK' } },
    )
  }, [])

  // Zmiana statusu (DNF / +2 / OK) — zachowujemy przypisanie do sesji.
  const setStatus = useCallback((solveId, status) => {
    setMeta((prev) => ({
      ...prev,
      [solveId]: { sessionId: prev[solveId]?.sessionId ?? 'default', status },
    }))
  }, [])

  // Usunięcie czasu → sprzątamy też jego metadane (bez „sierot" w localStorage).
  const forget = useCallback((solveId) => {
    setMeta((prev) => {
      if (!prev[solveId]) return prev
      const next = { ...prev }
      delete next[solveId]
      return next
    })
  }, [])

  const sessionIdOf = useCallback((solveId) => meta[solveId]?.sessionId ?? 'default', [meta])
  const statusOf = useCallback((solveId) => meta[solveId]?.status ?? 'OK', [meta])

  const value = useMemo(
    () => ({
      sessions,
      activeId,
      setActiveId,
      addSession,
      renameSession,
      removeSession,
      tagSolve,
      setStatus,
      forget,
      sessionIdOf,
      statusOf,
    }),
    [sessions, activeId, addSession, renameSession, removeSession, tagSolve, setStatus, forget, sessionIdOf, statusOf],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSessions() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSessions musi być użyte wewnątrz <SessionProvider>.')
  return ctx
}
