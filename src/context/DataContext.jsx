import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from './AuthContext'
import { apiRepo } from '../data/apiRepo'
import { localRepo } from '../data/localRepo'
import { clearPrimaryMoves } from '../data/primaryMovesStore'

/**
 * DataContext — JEDNA warstwa dostępu do historii ułożeń dla całej apki.
 *
 * Sedno abstrakcji: wybiera repozytorium (apiRepo dla zalogowanych, localRepo
 * dla Gościa) i wystawia identyczny interfejs. Komponenty (Timer, Stats,
 * wykresy) wołają `addSolve`/`solves` i NIE WIEDZĄ, czy dane lecą do chmury,
 * czy do localStorage. Zmiana źródła = podmiana jednej referencji `repo`.
 */
const DataContext = createContext(null)

export function DataProvider({ children }) {
  const { isAuthenticated, isGuest } = useAuth()
  const queryClient = useQueryClient()

  // Wybór implementacji repozytorium na podstawie trybu.
  const repo = useMemo(() => (isAuthenticated ? apiRepo : localRepo), [isAuthenticated])
  const active = isAuthenticated || isGuest

  const [solves, setSolves] = useState([]) // kanoniczne { id, time, scramble, status, createdAt }
  const [loading, setLoading] = useState(active)
  // Licznik „wyczyszczeń" — App nasłuchuje go, by przy Wipe zresetować też
  // swój stan nadpisań „Ustaw jako główny" (primaryMoves), którego tu nie trzymamy.
  const [wipeSignal, setWipeSignal] = useState(0)

  // Ładowanie historii przy zmianie trybu/repo.
  useEffect(() => {
    if (!active) {
      setSolves([])
      return
    }
    let alive = true
    setLoading(true)
    repo
      .getSolves()
      .then((list) => alive && setSolves(list))
      .catch(() => alive && setSolves([]))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [repo, active])

  // Po każdej mutacji: unieważniamy cache analityki, żeby wykresy się odświeżyły.
  const invalidateAnalytics = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['analytics'] })
  }, [queryClient])

  const addSolve = useCallback(
    async (ms, scramble = 'unrecorded', status = 'OK') => {
      const created = await repo.addSolve({ time: Math.round(ms), scramble, status })
      setSolves((prev) => [created, ...prev])
      invalidateAnalytics()
      return created
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
  const clearAll = useCallback(async () => {
    await repo.clearAll()
    setSolves([])
    // Wipe obejmuje też lokalne nadpisania algorytmów: kasujemy klucz w
    // localStorage i podbijamy sygnał, na który App zeruje stan w pamięci.
    clearPrimaryMoves()
    setWipeSignal((n) => n + 1)
    invalidateAnalytics()
  }, [repo, invalidateAnalytics])

  // Legacy-adapter: istniejące komponenty oczekują { ms, ts }. Mapujemy tu,
  // żeby ich nie przepisywać.
  const legacySolves = useMemo(
    () =>
      solves.map((s) => ({
        ms: s.time,
        ts: new Date(s.createdAt).getTime(),
        id: s.id,
        scramble: s.scramble,
      })),
    [solves],
  )

  const value = useMemo(
    () => ({ repo, mode: repo.kind, solves, legacySolves, loading, addSolve, deleteSolve, clearAll, wipeSignal }),
    [repo, solves, legacySolves, loading, addSolve, deleteSolve, clearAll, wipeSignal],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData musi być użyte wewnątrz <DataProvider>.')
  return ctx
}
