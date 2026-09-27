import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Box, Loader2 } from 'lucide-react'
import { useAuth } from './context/AuthContext'
import { useData } from './context/DataContext'
import { useSessions } from './context/SessionContext'
import { useSocial } from './context/SocialContext'
import { loadPrimaryMoves, savePrimaryMoves } from './data/primaryMovesStore'
import { loadNotes, loadStatuses, saveNotes, saveStatuses } from './data/algorithmProgressStore'
import { MAX_HISTORY, loadHistory, saveHistory } from './data/localDuelStore'
import SocialOverlays from './components/social/SocialOverlays'
import AuthScreen from './components/auth/AuthScreen'
import ProfileMenu from './components/account/ProfileMenu'
import Sidebar from './components/layout/Sidebar'
import MobileNav from './components/layout/MobileNav'
import ErrorBoundary from './components/common/ErrorBoundary'
import DashboardPage from './pages/DashboardPage'
import AlgorithmsPage from './pages/AlgorithmsPage'
import ConstellationPage from './pages/ConstellationPage'
import DuelPage from './pages/DuelPage'
import SocialHubPage from './pages/SocialHubPage'
import SyntaxPage from './pages/SyntaxPage'
import AlgorithmModal from './components/algorithms/AlgorithmModal'
import { ALGORITHMS } from './data/algorithms'
import { splitOrientation } from './lib/notation'

/**
 * App — jasna, organiczna scena + JEDNO źródło prawdy dla stanu apki.
 *
 * Podniesione tu, bo są współdzielone między zakładkami:
 *  - activeTab      — routing bez przeładowania,
 *  - solves         — historia ułożeń (Timer → Stats → Milestones),
 *  - statuses       — status nauki algorytmu (Library + Mapa),
 *  - primaryMoves   — nadpisania "Ustaw jako główny" (bez mutacji bazy),
 *  - notes          — notatki użytkownika per algorytm,
 *  - duels          — historia pojedynków Local Duel,
 *  - selectedId     — który algorytm pokazać w CENTRALNYM modalu.
 *
 * statuses, primaryMoves, notes i duels są trwałe: wczytujemy je z localStorage
 * przy montowaniu i zapisujemy przy każdej zmianie (moduły w src/data/*Store.js).
 *
 * Modal renderujemy raz, na poziomie App — dlatego otwiera się identycznie
 * z Biblioteki i z Mapy (Constellation).
 */
export default function App() {
  const { isAuthenticated, isGuest, isLoading } = useAuth()
  // Historia ułożeń przychodzi z DataContext — jednakowo dla chmury i Gościa.
  // App w ogóle nie wie, czy źródłem jest API czy localStorage.
  // `wipeSignal` rośnie za każdym „Wipe All Solves" — patrz efekt niżej.
  const { legacySolves, addSolve: addSolveRaw, wipeSignal } = useData()
  // Sesje: nowy czas przypinamy do aktywnej sesji zaraz po jego zapisaniu.
  const { tagSolve } = useSessions()
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
  const [statuses, setStatuses] = useState(loadStatuses)
  const [primaryMoves, setPrimaryMoves] = useState(loadPrimaryMoves) // „Ustaw jako główny"
  const [notes, setNotes] = useState(loadNotes)
  const [selectedId, setSelectedId] = useState(null)

  // Trwałość: przy każdej zmianie zapisujemy całą mapę/listę do localStorage.
  useEffect(() => void saveHistory(duels), [duels])
  useEffect(() => void saveStatuses(statuses), [statuses])
  useEffect(() => void savePrimaryMoves(primaryMoves), [primaryMoves])
  useEffect(() => void saveNotes(notes), [notes])

  // Wipe All Solves: DataContext zbił klucz w localStorage i podbił wipeSignal —
  // zerujemy też stan w pamięci, żeby algorytmy natychmiast wróciły do domyślnych.
  // Warunek `> 0` pomija pierwszy render (sygnał startuje od 0).
  useEffect(() => {
    if (wipeSignal > 0) setPrimaryMoves({})
  }, [wipeSignal])

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
  // więc nie koliduje.
  const changeTab = useCallback((id) => {
    if (id === 'duel') setDuelMode(null)
    setActiveTab(id)
  }, [])

  // Adapter pod istniejący TimerCard, który woła onSolve(ms). Po zapisie
  // przypinamy świeży solve do aktywnej sesji (id znamy dopiero po utworzeniu).
  const addSolve = useCallback(
    async (ms, scramble = 'unrecorded') => {
      const created = await addSolveRaw(ms, scramble)
      if (created?.id) tagSolve(created.id)
      return created
    },
    [addSolveRaw, tagSolve],
  )
  const addDuel = useCallback((d) => setDuels((prev) => [d, ...prev].slice(0, MAX_HISTORY)), [])
  const setStatus = useCallback((id, s) => setStatuses((p) => ({ ...p, [id]: s })), [])
  // "Ustaw jako główny": odcinamy wiodącą rotację orientacyjną (np. "y"),
  // żeby do nauki trafiła czysta sekwencja ruchów, a nie "y R U R' U'".
  const setPrimary = useCallback(
    (id, moves) => setPrimaryMoves((p) => ({ ...p, [id]: splitOrientation(moves).moves })),
    [],
  )
  const setNote = useCallback((id, text) => setNotes((p) => ({ ...p, [id]: text })), [])
  const openAlg = useCallback((id) => setSelectedId(id), [])
  const closeAlg = useCallback(() => setSelectedId(null), [])

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
        {/* key={activeTab} → crash na jednej zakładce nie przykleja się po zmianie */}
        <ErrorBoundary key={activeTab}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {activeTab === 'dashboard' && (
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
              {activeTab === 'map' && (
                <ConstellationPage
                  statuses={statuses}
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
          />
        )}
      </AnimatePresence>

      {/* globalne UI społecznościowe: wyzwania + powiadomienia (ponad zakładkami) */}
      <SocialOverlays />
    </div>
  )
}
