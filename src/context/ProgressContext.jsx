import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { useData } from './DataContext'
import { importLocalProgressOnce } from '../data/progressMigration'
import { splitOrientation } from '../lib/notation'

/**
 * ProgressContext — postęp nauki algorytmów: statusy z Biblioteki, rekordy
 * z trybu treningu (per algorytm I per wariant), notatki i wybór „Ustaw jako
 * główny".
 *
 * Źródło danych to TO SAMO repozytorium co dla czasów (DataContext.repo):
 * zalogowany → chmura (apiRepo), Gość → localStorage (localRepo). Komponenty
 * nie wiedzą, gdzie dane lecą — dostają mapy i akcje.
 *
 * Zapisy są OPTYMISTYCZNE: UI zmienia się od razu, żądanie idzie w tle.
 * Gdy zapis się nie uda, cofamy zmianę — ale tylko jeśli w międzyczasie
 * nikt jej nie nadpisał (np. kolejnym kliknięciem statusu). Wyjątek to
 * notatki: tekstu, który ktoś właśnie napisał, nie cofamy (szczegóły niżej).
 */
const ProgressContext = createContext(null)

// Ile czekamy po ostatnim znaku, zanim wyślemy notatkę. Bez tego każde
// naciśnięcie klawisza byłoby osobnym żądaniem do serwera.
const NOTE_SAVE_DELAY = 700

// Niemutująca podmiana jednego rekordu w mapie { algId: { sekwencja: ms } }.
function withPb(pbs, algId, moves, time) {
  const byMoves = { ...pbs[algId] }
  if (time == null) delete byMoves[moves]
  else byMoves[moves] = time
  return { ...pbs, [algId]: byMoves }
}

/**
 * Cofnięcie optymistycznej zmiany w mapie { algId: wartość } — tylko jeśli
 * nadal stoi tam NASZA wartość (nowsza zmiana wygrywa, nie cofamy jej).
 */
function revertIf(map, algId, ours, prev) {
  if (map[algId] !== ours) return map
  const next = { ...map }
  if (prev === undefined) delete next[algId]
  else next[algId] = prev
  return next
}

export function ProgressProvider({ children }) {
  const { isAuthenticated, isGuest } = useAuth()
  const { repo } = useData()
  const active = isAuthenticated || isGuest

  const [statuses, setStatuses] = useState({}) // { algId: 'new'|'learning'|'mastered' }
  const [pbs, setPbs] = useState({}) // { algId: { sekwencja wariantu: ms } }
  const [notes, setNotes] = useState({}) // { algId: tekst }
  const [primaryMoves, setPrimaryMoves] = useState({}) // { algId: sekwencja } — „Ustaw jako główny"

  // Lustra stanu — akcje czytają z nich aktualną wartość bez przebudowy callbacków.
  const statusesRef = useRef(statuses)
  const pbsRef = useRef(pbs)
  const primaryRef = useRef(primaryMoves)
  useEffect(() => void (statusesRef.current = statuses), [statuses])
  useEffect(() => void (pbsRef.current = pbs), [pbs])
  useEffect(() => void (primaryRef.current = primaryMoves), [primaryMoves])

  // Ładowanie przy zmianie trybu/repo (Gość ↔ zalogowany, wylogowanie).
  useEffect(() => {
    setStatuses({})
    setPbs({})
    setNotes({})
    setPrimaryMoves({})
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
        setNotes(data?.notes ?? {})
        setPrimaryMoves(data?.primaryMoves ?? {})
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
        setStatuses((p) => revertIf(p, algId, status, prev))
      })
    },
    [repo],
  )

  /**
   * „Ustaw jako główny": odcinamy wiodącą rotację orientacyjną (np. "y"),
   * żeby do nauki trafiła czysta sekwencja ruchów, a nie "y R U R' U'".
   */
  const setPrimary = useCallback(
    (algId, rawMoves) => {
      const moves = splitOrientation(rawMoves).moves
      const prev = primaryRef.current[algId]
      setPrimaryMoves((p) => ({ ...p, [algId]: moves }))
      repo.setAlgPrimary(algId, moves).catch((err) => {
        console.error('[Progress] Zapis wariantu głównego nie powiódł się:', err)
        setPrimaryMoves((p) => revertIf(p, algId, moves, prev))
      })
    },
    [repo],
  )

  // ── Notatki ──
  // Tekst w UI zmienia się od razu, a zapis czeka NOTE_SAVE_DELAY po ostatnim
  // znaku. Oczekujące zapisy trzymamy per algorytm: { timer, text, repo }.
  // `repo` zapamiętujemy przy pisaniu, żeby notatka zalogowanego nigdy nie
  // wylądowała w localStorage Gościa, gdy tryb zmieni się przed wysłaniem.
  const pendingNotes = useRef(new Map())

  const saveNote = useCallback((algId) => {
    const job = pendingNotes.current.get(algId)
    if (!job) return
    clearTimeout(job.timer)
    pendingNotes.current.delete(algId)
    // Błędu nie cofamy — to tekst, który użytkownik ma właśnie przed oczami.
    // Wysyłamy zawsze CAŁĄ notatkę, więc następna edycja i tak zapisze wszystko.
    job.repo.setAlgNote(algId, job.text).catch((err) =>
      console.error('[Progress] Zapis notatki nie powiódł się:', err),
    )
  }, [])

  /** Wysyła od razu wszystkie czekające notatki (zamknięcie modalu, ukrycie karty). */
  const flushNotes = useCallback(() => {
    for (const algId of [...pendingNotes.current.keys()]) saveNote(algId)
  }, [saveNote])

  const setNote = useCallback(
    (algId, text) => {
      setNotes((p) => ({ ...p, [algId]: text }))
      clearTimeout(pendingNotes.current.get(algId)?.timer)
      pendingNotes.current.set(algId, {
        text,
        repo,
        timer: setTimeout(() => saveNote(algId), NOTE_SAVE_DELAY),
      })
    },
    [repo, saveNote],
  )

  // Karta schowana (przełączenie, zamykanie strony) → nie czekamy na timer.
  // Przy odmontowaniu providera też wysyłamy to, co zostało.
  useEffect(() => {
    const onVisibility = () => document.visibilityState === 'hidden' && flushNotes()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      flushNotes()
    }
  }, [flushNotes])

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
    () => ({
      statuses,
      pbs,
      notes,
      primaryMoves,
      setStatus,
      recordPb,
      setNote,
      flushNotes,
      setPrimary,
    }),
    [statuses, pbs, notes, primaryMoves, setStatus, recordPb, setNote, flushNotes, setPrimary],
  )

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress() {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress musi być użyte wewnątrz <ProgressProvider>.')
  return ctx
}
