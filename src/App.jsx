import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Box, Loader2 } from 'lucide-react'
import { useAuth } from './context/AuthContext'
import { useData } from './context/DataContext'
import { useProgress } from './context/ProgressContext'
import { useSessions } from './context/SessionContext'
import { useSocial } from './context/SocialContext'
import { MAX_HISTORY, loadHistory, saveHistory } from './data/localDuelStore'
import SocialOverlays from './components/social/SocialOverlays'
import AuthScreen from './components/auth/AuthScreen'
import ProfileMenu from './components/account/ProfileMenu'
import Sidebar from './components/layout/Sidebar'
import MobileNav from './components/layout/MobileNav'
import ErrorBoundary from './components/common/ErrorBoundary'
import DashboardPage from './pages/DashboardPage'
import AlgorithmsPage from './pages/AlgorithmsPage'
import DuelPage from './pages/DuelPage'
import SocialHubPage from './pages/SocialHubPage'
import SyntaxPage from './pages/SyntaxPage'
import TrainingPage from './pages/TrainingPage'
import AlgorithmModal from './components/algorithms/AlgorithmModal'
import { ALGORITHMS } from './data/algorithms'

/**
 * App — jasna, organiczna scena + JEDNO źródło prawdy dla stanu apki.
 *
 * Podniesione tu, bo są współdzielone między zakładkami:
 *  - activeTab      — routing bez przeładowania,
 *  - solves         — historia ułożeń (Timer → Stats → Milestones),
 *  - duels          — historia pojedynków Local Duel,
 *  - selectedId     — który algorytm pokazać w CENTRALNYM modalu,
 *  - training       — trwający trening { algId, moves } (albo null).
 *
 * duels są trwałe: wczytujemy je z localStorage przy montowaniu i zapisujemy
 * przy każdej zmianie (localDuelStore).
 *
 * Postęp nauki algorytmów — statusy, rekordy z treningu, notatki i nadpisania
 * „Ustaw jako główny" (bez mutacji bazy algorytmów) — przychodzi z
 * ProgressContext. Jak czasy z DataContext: w chmurze dla zalogowanego,
 * w localStorage dla Gościa.
 *
 * Modal renderujemy raz, na poziomie App — tu jest postęp nauki, który
 * pokazuje, i przełączanie zakładek, którego potrzebuje „Trenuj algorytm".
 */
export default function App() {
  const { isAuthenticated, isGuest, isLoading } = useAuth()
  // Historia ułożeń przychodzi z DataContext — jednakowo dla chmury i Gościa.
  // App w ogóle nie wie, czy źródłem jest API czy localStorage.
  const { legacySolves, addSolve: addSolveRaw } = useData()
  // Sesje: nowy czas od razu zapisujemy z sessionId aktywnej sesji.
  const { activeSessionId } = useSessions()
  // Postęp nauki: statusy (Library), rekordy z treningu (per algorytm
  // I wariant), notatki i nadpisania „Ustaw jako główny".
  const { statuses, pbs, notes, primaryMoves, setStatus, recordPb, setNote, flushNotes, setPrimary } =
    useProgress()
  // Sygnał nawigacji z systemu wyzwań: gdy pojawi się pendingDuel (obaj gracze
  // zaakceptowali), przenosimy widok do Areny — samo dołączenie do pokoju robi
  // OnlineArenaPage, konsumując pendingDuel.
  const { pendingDuel } = useSocial()
  const [activeTab, setActiveTab] = useState('dashboard')
  // Tryb w scalonej sekcji Duel: null = ekran wyboru, 'local' | 'online' = tryb.
  const [duelMode, setDuelMode] = useState(null)
  // Stan trwały — wczytany z localStorage, więc przeżywa odświeżenie strony
  // (lazy-init: przekazujemy funkcję, żeby czytać storage raz, przy montowaniu).
  const [duels, setDuels] = useState(loadHistory) // historia pojedynków Local Duel
  const [selectedId, setSelectedId] = useState(null)
  // Trening algorytmu: gdy ustawiony, zakładka Timera pokazuje TrainingPage
  // zamiast Dashboardu. Nie jest trwały — odświeżenie wraca do zwykłego Timera.
  const [training, setTraining] = useState(null) // { algId, moves } | null

  // Trwałość: przy każdej zmianie zapisujemy całą listę do localStorage.
  useEffect(() => void saveHistory(duels), [duels])

  // Wyzwanie zaakceptowane → wchodzimy do scalonej sekcji Duel od razu w trybie
  // online (z pominięciem ekranu wyboru), a OnlineArenaPage sam dołącza do pokoju.
  useEffect(() => {
    if (pendingDuel) {
      setDuelMode('online')
      setActiveTab('duel')
    }
  }, [pendingDuel])

  // Nawigacja: klik w zakładkę „Duel" z paska zawsze zaczyna od ekranu wyboru
  // trybu (reset duelMode). Wejście z wyzwania idzie inną ścieżką (efekt wyżej),
  // więc nie koliduje. Każdy klik w pasek kończy też trening — także klik
  // w „Timer", który wraca wtedy do zwykłego Dashboardu.
  const changeTab = useCallback((id) => {
    if (id === 'duel') setDuelMode(null)
    setTraining(null)
    setActiveTab(id)
  }, [])

  // Adapter pod istniejący TimerCard, który woła onSolve(ms, scramble).
  // Sesja jest polem solve'a, więc trafia do zapisu razem z czasem.
  const addSolve = useCallback(
    (ms, scramble = 'unrecorded') => addSolveRaw(ms, scramble, { sessionId: activeSessionId }),
    [addSolveRaw, activeSessionId],
  )
  const addDuel = useCallback((d) => setDuels((prev) => [d, ...prev].slice(0, MAX_HISTORY)), [])
  const openAlg = useCallback((id) => setSelectedId(id), [])
  // Zamknięcie modalu wysyła od razu notatkę, która jeszcze czeka na zapis.
  const closeAlg = useCallback(() => {
    setSelectedId(null)
    flushNotes()
  }, [flushNotes])

  // „Trenuj algorytm" z modalu: zamykamy modal i przechodzimy do Timera
  // w trybie treningu wybranego wariantu.
  const startTraining = useCallback(
    (algId, moves) => {
      closeAlg()
      setTraining({ algId, moves })
      setActiveTab('dashboard')
    },
    [closeAlg],
  )
  const changeTrainingVariant = useCallback(
    (moves) => setTraining((t) => (t ? { ...t, moves } : t)),
    [],
  )
  const exitTraining = useCallback(() => setTraining(null), [])

  const trainingAlg = training ? ALGORITHMS.find((a) => a.id === training.algId) : null
  const viewKey = activeTab === 'dashboard' && trainingAlg ? 'training' : activeTab

  // Efektywne moves = nadpisanie lub oryginał.
  const movesFor = useCallback((a) => primaryMoves[a.id] ?? a.moves, [primaryMoves])

  // Wybrany algorytm (id → obiekt z bazy + ewentualne nadpisanie sekwencji).
  const selected = useMemo(() => {
    const base = ALGORITHMS.find((a) => a.id === selectedId)
    return base ? { ...base, moves: primaryMoves[base.id] ?? base.moves } : null
  }, [selectedId, primaryMoves])

  // ── BRAMA AUTORYZACJI ──
  // 1) Dopóki sprawdzamy sesję (/me) — delikatny splash, żeby nie mrugnąć
  //    ekranem logowania zalogowanemu userowi.
  if (isLoading) {
    return (
      <div className="bg-organic flex min-h-screen items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4 text-ink-400"
        >
          <Box size={30} strokeWidth={1.25} className="text-ink-950" />
          <Loader2 size={18} className="animate-spin" />
        </motion.div>
      </div>
    )
  }

  // 2) Ani zalogowany, ani Gość → ekran logowania (z opcją „Continue as Guest").
  if (!isAuthenticated && !isGuest) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="auth"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <AuthScreen />
        </motion.div>
      </AnimatePresence>
    )
  }

  // 3) Zalogowany LUB Gość → pełna aplikacja.
  return (
    <div className="bg-organic relative min-h-screen">
      {/* desktop: boczna szyna; mobile (< md): dolny, szklany tab bar */}
      <Sidebar active={activeTab} onChange={changeTab} />
      <MobileNav active={activeTab} onChange={changeTab} />

      {/* szklany awatar + modal ustawień */}
      <ProfileMenu />

      <main className="relative md:pl-[100px] md:pr-2">
        {/* key={viewKey} → crash na jednej zakładce nie przykleja się po zmianie;
            trening ma własny klucz, więc wejście/wyjście z niego też ma animację */}
        <ErrorBoundary key={viewKey}>
          <AnimatePresence mode="wait">
            <motion.div
              key={viewKey}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {activeTab === 'dashboard' && trainingAlg && (
                <TrainingPage
                  alg={trainingAlg}
                  moves={training.moves}
                  pbs={pbs[trainingAlg.id] ?? {}}
                  onRecord={recordPb}
                  onVariantChange={changeTrainingVariant}
                  onExit={exitTraining}
                />
              )}
              {activeTab === 'dashboard' && !trainingAlg && (
                <DashboardPage solves={legacySolves} onSolve={addSolve} />
              )}
              {activeTab === 'algorithms' && (
                <AlgorithmsPage
                  statuses={statuses}
                  onStatusChange={setStatus}
                  movesFor={movesFor}
                  onOpenAlg={openAlg}
                />
              )}
              {activeTab === 'duel' && (
                <DuelPage
                  mode={duelMode}
                  onSelectMode={setDuelMode}
                  duels={duels}
                  onDuel={addDuel}
                />
              )}
              {activeTab === 'social' && <SocialHubPage />}
              {activeTab === 'syntax' && <SyntaxPage />}
            </motion.div>
          </AnimatePresence>
        </ErrorBoundary>
      </main>

      {/* CENTRALNY modal — jeden dla całej apki */}
      <AnimatePresence>
        {selected && (
          <AlgorithmModal
            key={selected.id}
            alg={selected}
            onClose={closeAlg}
            onSetPrimary={setPrimary}
            notes={notes[selected.id] ?? ''}
            onNotesChange={setNote}
            pbs={pbs[selected.id] ?? {}}
            onTrain={startTraining}
          />
        )}
      </AnimatePresence>

      {/* globalne UI społecznościowe: wyzwania + powiadomienia (ponad zakładkami) */}
      <SocialOverlays />
    </div>
  )
}
