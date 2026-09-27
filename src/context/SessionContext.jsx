import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useData } from './DataContext'

/**
 * SessionContext — sesje układania widziane z perspektywy UI.
 *
 * Same sesje i przypisanie czasów do sesji to DANE (DataContext → repo: chmura
 * albo localStorage Gościa), więc przeżywają zmianę urządzenia. Tu zostaje
 * tylko stan interfejsu:
 *
 *  - sessions  — [„Główna", ...nazwane sesje z DataContext],
 *  - activeId  — która sesja jest aktywna NA TYM URZĄDZENIU (localStorage),
 *  - akcje: addSession / renameSession / removeSession.
 *
 * „Główna" (id: 'default') nie ma rekordu w danych — czasy bez sesji mają
 * sessionId = null. Zamianę 'default' ↔ null robią sessionKeyOf / toSessionId.
 */

const ACTIVE_KEY = 'cubeverse_active_session'

export const DEFAULT_SESSION = { id: 'default', name: 'Główna' }

/** Do której sesji (w UI) należy solve: null w danych = „Główna". */
export const sessionKeyOf = (solve) => solve?.sessionId ?? DEFAULT_SESSION.id

/** Id sesji z UI → wartość do zapisu w danych („Główna" = null). */
const toSessionId = (id) => (id === DEFAULT_SESSION.id ? null : id)

function loadActiveId() {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY)
    return (raw && JSON.parse(raw)) || DEFAULT_SESSION.id
  } catch {
    return DEFAULT_SESSION.id
  }
}

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const { sessions: named, createSession, renameSession: renameInData, deleteSession } = useData()

  const [storedActiveId, setActiveId] = useState(loadActiveId)
  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_KEY, JSON.stringify(storedActiveId))
    } catch {
      /* brak dostępu do localStorage — wybór sesji nie przetrwa odświeżenia */
    }
  }, [storedActiveId])

  // „Główna" zawsze pierwsza.
  const sessions = useMemo(() => [DEFAULT_SESSION, ...named], [named])

  // Zapamiętana sesja mogła zniknąć (usunięta, inne konto, jeszcze się ładuje)
  // → pokazujemy „Główną", ale NIE nadpisujemy zapamiętanego wyboru.
  const activeId = sessions.some((s) => s.id === storedActiveId) ? storedActiveId : DEFAULT_SESSION.id

  const addSession = useCallback(
    async (name) => {
      const clean = (name || '').trim() || 'Nowa sesja'
      const created = await createSession(clean)
      setActiveId(created.id) // od razu przełączamy na nową sesję
      return created
    },
    [createSession],
  )

  const renameSession = useCallback(
    async (id, name) => {
      const clean = (name || '').trim()
      if (!clean || id === DEFAULT_SESSION.id) return
      await renameInData(id, clean)
    },
    [renameInData],
  )

  // Czasy z usuwanej sesji wracają do „Głównej" (robi to warstwa danych).
  const removeSession = useCallback(
    async (id) => {
      if (id === DEFAULT_SESSION.id) return // „Głównej" nie usuwamy
      await deleteSession(id)
      setActiveId((cur) => (cur === id ? DEFAULT_SESSION.id : cur))
    },
    [deleteSession],
  )

  const value = useMemo(
    () => ({
      sessions,
      activeId,
      // wartość sessionId dla NOWEGO czasu (null = „Główna")
      activeSessionId: toSessionId(activeId),
      setActiveId,
      addSession,
      renameSession,
      removeSession,
    }),
    [sessions, activeId, addSession, renameSession, removeSession],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSessions() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSessions musi być użyte wewnątrz <SessionProvider>.')
  return ctx
}
