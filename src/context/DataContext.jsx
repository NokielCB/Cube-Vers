import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from './AuthContext'
import { apiRepo } from '../data/apiRepo'
import { localRepo } from '../data/localRepo'
import { clearPrimaryMoves } from '../data/primaryMovesStore'
import { migrateLegacyMeta } from '../data/legacySessionMeta'

/**
 * DataContext — JEDNA warstwa dostępu do historii ułożeń i sesji dla całej apki.
 *
 * Sedno abstrakcji: wybiera repozytorium (apiRepo dla zalogowanych, localRepo
 * dla Gościa) i wystawia identyczny interfejs. Komponenty (Timer, Stats,
 * wykresy) wołają `addSolve`/`solves` i NIE WIEDZĄ, czy dane lecą do chmury,
 * czy do localStorage. Zmiana źródła = podmiana jednej referencji `repo`.
 *
 * Kara (+2/DNF) i sesja to zwykłe pola solve'a (`status`, `sessionId`) —
 * jedno źródło prawdy, zapisywane tam, gdzie reszta danych.
 */
const DataContext = createContext(null)

async function loadAll(repo) {
  return Promise.all([repo.getSolves(), repo.getSessions()])
}

export function DataProvider({ children }) {
  const { isAuthenticated, isGuest } = useAuth()
  const queryClient = useQueryClient()

  // Wybór implementacji repozytorium na podstawie trybu.
  const repo = useMemo(() => (isAuthenticated ? apiRepo : localRepo), [isAuthenticated])
  const active = isAuthenticated || isGuest

  const [solves, setSolves] = useState([]) // kanoniczne { id, time, scramble, status, createdAt, sessionId }
  const [sessions, setSessions] = useState([]) // nazwane sesje { id, name } (bez „Głównej")
  const [loading, setLoading] = useState(active)
  // Licznik „wyczyszczeń" — App nasłuchuje go, by przy Wipe zresetować też
  // swój stan nadpisań „Ustaw jako główny" (primaryMoves), którego tu nie trzymamy.
  const [wipeSignal, setWipeSignal] = useState(0)

  // Ładowanie historii i sesji przy zmianie trybu/repo.
  useEffect(() => {
    if (!active) {
      setSolves([])
      setSessions([])
      return
    }
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        let [list, sess] = await loadAll(repo)
        if (!alive) return
        // Jednorazowo: stare kary/sesje z localStorage → repozytorium.
        // Best-effort — błąd migracji nie może zablokować wczytania danych.
        const migrated = await migrateLegacyMeta(repo, list).catch((err) => {
          console.error('[DataContext] Migracja starych metadanych nie powiodła się:', err)
          return false
        })
        if (migrated && alive) [list, sess] = await loadAll(repo)
        if (!alive) return
        setSolves(list)
        setSessions(sess)
      } catch {
        if (!alive) return
        setSolves([])
        setSessions([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [repo, active])

  // Po każdej mutacji: unieważniamy cache analityki, żeby wykresy się odświeżyły.
  const invalidateAnalytics = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['analytics'] })
  }, [queryClient])

  /** Nowy czas. `sessionId` null = „Główna". */
  const addSolve = useCallback(
    async (ms, scramble = 'unrecorded', { status = 'OK', sessionId = null } = {}) => {
      const payload = { time: Math.round(ms), scramble, status, sessionId }
      let created
      try {
        created = await repo.addSolve(payload)
      } catch (err) {
        // Sesję mogło usunąć inne urządzenie (serwer: 404). Czasu nie tracimy —
        // zapisujemy go w „Głównej" i wyrzucamy nieaktualną sesję z listy.
        if (!sessionId || err?.status !== 404) throw err
        created = await repo.addSolve({ ...payload, sessionId: null })
        setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      }
      setSolves((prev) => [created, ...prev])
      invalidateAnalytics()
      return created
    },
    [repo, invalidateAnalytics],
  )

  /** Kara: 'OK' | 'PLUS2' | 'DNF'. Zapis w repo, potem podmiana w stanie. */
  const setSolveStatus = useCallback(
    async (id, status) => {
      const updated = await repo.updateSolve(id, { status })
      setSolves((prev) => prev.map((s) => (s.id === id ? updated : s)))
      invalidateAnalytics()
      return updated
    },
    [repo, invalidateAnalytics],
  )

  const deleteSolve = useCallback(
    async (id) => {
      await repo.deleteSolve(id)
      setSolves((prev) => prev.filter((s) => s.id !== id))
      invalidateAnalytics()
    },
    [repo, invalidateAnalytics],
  )

  // Wipe All Solves — kasuje CAŁĄ historię (Gość: localStorage, Zalogowany:
  // DELETE /api/solves/clear). Po sukcesie natychmiast zeruje stan do [] bez
  // przeładowania strony — Dashboard i wykresy same się odświeżają.
  // Sesje (same nazwy) zostają — kasujemy tylko czasy.
  const clearAll = useCallback(async () => {
    await repo.clearAll()
    setSolves([])
    // Wipe obejmuje też lokalne nadpisania algorytmów: kasujemy klucz w
    // localStorage i podbijamy sygnał, na który App zeruje stan w pamięci.
    clearPrimaryMoves()
    setWipeSignal((n) => n + 1)
    invalidateAnalytics()
  }, [repo, invalidateAnalytics])

  // — sesje układania —
  const createSession = useCallback(
    async (name) => {
      const created = await repo.createSession(name)
      setSessions((prev) => [...prev, created])
      return created
    },
    [repo],
  )

  const renameSession = useCallback(
    async (id, name) => {
      const updated = await repo.renameSession(id, name)
      setSessions((prev) => prev.map((s) => (s.id === id ? updated : s)))
    },
    [repo],
  )

  // Czasy usuniętej sesji wracają do „Głównej" (repo robi to samo u siebie).
  const deleteSession = useCallback(
    async (id) => {
      await repo.deleteSession(id)
      setSessions((prev) => prev.filter((s) => s.id !== id))
      setSolves((prev) => prev.map((s) => (s.sessionId === id ? { ...s, sessionId: null } : s)))
    },
    [repo],
  )

  // Legacy-adapter: istniejące komponenty oczekują { ms, ts }. Mapujemy tu,
  // żeby ich nie przepisywać.
  const legacySolves = useMemo(
    () =>
      solves.map((s) => ({
        ms: s.time,
        ts: new Date(s.createdAt).getTime(),
        id: s.id,
        scramble: s.scramble,
        status: s.status ?? 'OK',
        sessionId: s.sessionId ?? null,
      })),
    [solves],
  )

  const value = useMemo(
    () => ({
      repo,
      mode: repo.kind,
      solves,
      legacySolves,
      sessions,
      loading,
      addSolve,
      setSolveStatus,
      deleteSolve,
      clearAll,
      createSession,
      renameSession,
      deleteSession,
      wipeSignal,
    }),
    [
      repo,
      solves,
      legacySolves,
      sessions,
      loading,
      addSolve,
      setSolveStatus,
      deleteSolve,
      clearAll,
      createSession,
      renameSession,
      deleteSession,
      wipeSignal,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData musi być użyte wewnątrz <DataProvider>.')
  return ctx
}
