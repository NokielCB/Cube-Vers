import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { useData } from './DataContext'
import { importLocalProgressOnce } from '../data/progressMigration'

/**
 * ProgressContext — postęp nauki algorytmów: statusy z Biblioteki i rekordy
 * z trybu treningu (per algorytm I per wariant).
 *
 * Źródło danych to TO SAMO repozytorium co dla czasów (DataContext.repo):
 * zalogowany → chmura (apiRepo), Gość → localStorage (localRepo). Komponenty
 * nie wiedzą, gdzie dane lecą — dostają `statuses`, `pbs` i dwie akcje.
 *
 * Zapisy są OPTYMISTYCZNE: UI zmienia się od razu, żądanie idzie w tle.
 * Gdy zapis się nie uda, cofamy zmianę — ale tylko jeśli w międzyczasie
 * nikt jej nie nadpisał (np. kolejnym kliknięciem statusu).
 */
const ProgressContext = createContext(null)

// Niemutująca podmiana jednego rekordu w mapie { algId: { sekwencja: ms } }.
function withPb(pbs, algId, moves, time) {
  const byMoves = { ...pbs[algId] }
  if (time == null) delete byMoves[moves]
  else byMoves[moves] = time
  return { ...pbs, [algId]: byMoves }
}

export function ProgressProvider({ children }) {
  const { isAuthenticated, isGuest } = useAuth()
  const { repo } = useData()
  const active = isAuthenticated || isGuest

  const [statuses, setStatuses] = useState({}) // { algId: 'new'|'learning'|'mastered' }
  const [pbs, setPbs] = useState({}) // { algId: { sekwencja wariantu: ms } }

  // Lustra stanu — akcje czytają z nich aktualną wartość bez przebudowy callbacków.
  const statusesRef = useRef(statuses)
  const pbsRef = useRef(pbs)
  useEffect(() => void (statusesRef.current = statuses), [statuses])
  useEffect(() => void (pbsRef.current = pbs), [pbs])

  // Ładowanie przy zmianie trybu/repo (Gość ↔ zalogowany, wylogowanie).
  useEffect(() => {
    setStatuses({})
    setPbs({})
    if (!active) return
    let alive = true
    ;(async () => {
      try {
        // Zalogowany: jednorazowo przenosimy stare lokalne dane tej przeglądarki.
        // Best-effort — błąd migracji nie może zablokować wczytania postępu.
        if (repo.kind === 'api') {
          await importLocalProgressOnce().catch((err) =>
            console.error('[Progress] Przeniesienie lokalnego postępu nie powiodło się:', err),
          )
        }
        const data = await repo.getProgress()
        if (!alive) return
        setStatuses(data?.statuses ?? {})
        setPbs(data?.pbs ?? {})
      } catch (err) {
        console.error('[Progress] Nie udało się wczytać postępu:', err)
      }
    })()
    return () => {
      alive = false
    }
  }, [repo, active])

  /** Status nauki algorytmu (klik w badge w Bibliotece). */
  const setStatus = useCallback(
    (algId, status) => {
      const prev = statusesRef.current[algId]
      setStatuses((p) => ({ ...p, [algId]: status }))
      repo.setAlgStatus(algId, status).catch((err) => {
        console.error('[Progress] Zapis statusu nie powiódł się:', err)
        setStatuses((p) => {
          if (p[algId] !== status) return p // nowszy klik — nie cofamy
          const next = { ...p }
          if (prev === undefined) delete next[algId]
          else next[algId] = prev
          return next
        })
      })
    },
    [repo],
  )

  /**
   * Czas z treningu. Zapisujemy go tylko, gdy bije rekord wariantu. Po odpowiedzi
   * synchronizujemy się z rekordem z repo — w chmurze inne urządzenie mogło mieć
   * już lepszy czas i wtedy to on obowiązuje.
   */
  const recordPb = useCallback(
    (algId, moves, ms) => {
      const time = Math.round(ms)
      const prev = pbsRef.current[algId]?.[moves]
      if (prev != null && prev <= time) return
      setPbs((p) => withPb(p, algId, moves, time))
      repo
        .recordAlgPb(algId, moves, time)
        .then((saved) => setPbs((p) => withPb(p, algId, moves, saved.time)))
        .catch((err) => {
          console.error('[Progress] Zapis rekordu nie powiódł się:', err)
          setPbs((p) => (p[algId]?.[moves] === time ? withPb(p, algId, moves, prev) : p))
        })
    },
    [repo],
  )

  const value = useMemo(
    () => ({ statuses, pbs, setStatus, recordPb }),
    [statuses, pbs, setStatus, recordPb],
  )

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress() {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress musi być użyte wewnątrz <ProgressProvider>.')
  return ctx
}
