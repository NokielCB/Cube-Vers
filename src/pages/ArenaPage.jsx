import { useCallback, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Crown, Shuffle, Swords } from 'lucide-react'
import { DUEL, useDuelTimer } from '../hooks/useDuelTimer'
import { useLocalDuelRoster } from '../hooks/useLocalDuelRoster'
import { generateScramble } from '../lib/scramble'
import { formatTime } from '../lib/formatTime'
import DuelBoard from '../components/arena/DuelBoard'
import DuelResult from '../components/arena/DuelResult'
import LocalDuelRoster from '../components/arena/LocalDuelRoster'

/**
 * ArenaPage — tryb „Split-Time Local Duel": dwie osoby, jedna klawiatura,
 * jeden wspólny zegar. Cała mechanika czasu żyje w useDuelTimer; tu tylko
 * komponujemy widok bento i spinamy wynik z podniesioną historią (App).
 *
 * @param {{ duels: object[], onDuel: (d:object)=>void }} props
 */
// [podpowiedź dla klawiatury (md+), podpowiedź dla dotyku (< md)]
const HINT = {
  [DUEL.IDLE]: ['Przytrzymaj spację, aby wystartować wspólny zegar', 'Przytrzymaj arenę, aby wystartować wspólny zegar'],
  [DUEL.HOLDING]: ['Trzymaj…', 'Trzymaj…'],
  [DUEL.READY]: ['Puść — start!', 'Puść — start!'],
  [DUEL.RUNNING_BOTH]: ['Spacja = pierwszy finisz', 'Dotknięcie = pierwszy finisz'],
  [DUEL.RUNNING_SECOND]: ['Spacja = drugi finisz', 'Dotknięcie = drugi finisz'],
  [DUEL.FINISHED]: ['', ''],
}

// Ile pikseli ruchu palca uznajemy za SCROLL (a nie „trzymanie w miejscu").
const MOVE_TOLERANCE = 12

export default function ArenaPage({ duels = [], onDuel }) {
  const { phase, times, displayARef, displayBRef, reset, cancel, pressDown, pressUp } = useDuelTimer()
  const { players, addPlayer, renamePlayer, removePlayer, recordResult, maxPlayers, minPlayers } =
    useLocalDuelRoster()
  const [scramble, setScramble] = useState(() => generateScramble())

  // Nowy pojedynek = reset maszyny + świeży, wspólny scramble dla obu graczy.
  const newDuel = useCallback(() => {
    setScramble(generateScramble())
    reset()
  }, [reset])

  // Zapis wyniku: bilans W/L trafia do trwałej listy graczy, a lekki wpis do
  // trwałej historii „ostatnich pojedynków" (App → localStorage) pod areną.
  const handleSave = useCallback(
    (d) => {
      recordResult(d.winnerId, d.loserId)
      onDuel?.(d)
    },
    [recordResult, onDuel],
  )

  // Tablica wyników liczona z trwałego bilansu graczy.
  const totalDecided = players.reduce((n, p) => n + p.wins, 0)

  const arming = phase === DUEL.HOLDING || phase === DUEL.READY

  // ─────────── DOTYK: start tylko, gdy palec stoi w miejscu ───────────
  // Ten sam wzorzec co w solowym timerze: uzbrajamy na touchstart, ale jeśli
  // palec przesunie się bardziej niż MOVE_TOLERANCE (użytkownik scrolluje),
  // anulujemy uzbrojenie i NIE startujemy przy podniesieniu palca. Split w
  // trakcie biegu działa normalnie (dotknięcie = split — patrz pressDown).
  const touchStartPos = useRef(null)
  const touchMoved = useRef(false)

  const onArenaTouchStart = useCallback(
    (e) => {
      if (phase === DUEL.FINISHED) return
      const t = e.touches?.[0]
      touchStartPos.current = t ? { x: t.clientX, y: t.clientY } : null
      touchMoved.current = false
      pressDown()
    },
    [phase, pressDown],
  )

  const onArenaTouchMove = useCallback(
    (e) => {
      if (touchMoved.current || !touchStartPos.current) return
      const t = e.touches?.[0]
      if (!t) return
      const dx = t.clientX - touchStartPos.current.x
      const dy = t.clientY - touchStartPos.current.y
      if (Math.hypot(dx, dy) > MOVE_TOLERANCE) {
        touchMoved.current = true
        cancel() // anuluje tylko uzbrojenie; w biegu nic nie robi
      }
    },
    [cancel],
  )

  const onArenaTouchEnd = useCallback(() => {
    if (phase === DUEL.FINISHED) return
    if (touchMoved.current) {
      // To był scroll — uzbrojenie już anulowane, nie startujemy.
      touchMoved.current = false
      return
    }
    pressUp()
  }, [phase, pressUp])

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-24 md:pt-10 lg:px-10">
      {/* ---------- bento header ---------- */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 22 }}
        className="grid gap-4 lg:grid-cols-3"
      >
        <div className="tile flex flex-col justify-between p-6 sm:p-8 lg:col-span-2 lg:p-10">
          <div className="flex items-center gap-2 text-ink-400">
            <Swords size={16} strokeWidth={1.5} />
            <span className="text-[11px] font-medium uppercase tracking-[0.14em]">
              Local Duel · One Keyboard
            </span>
          </div>
          <div className="mt-10">
            <h1 className="text-4xl font-semibold tracking-tight text-ink-950 sm:text-5xl">
              Two solvers,
              <br />
              <span className="text-ink-400">one shared clock.</span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-500">
              Jeden zegar, dwa splity. Pierwsza spacja zamraża czas szybszego, druga kończy
              pojedynek. Kto był kim — przypiszecie po wyścigu.
            </p>
          </div>
        </div>

        {/* czarny kafel: tablica wyników graczy (bilans W pamięta się między sesjami) */}
        <div className="tile-dark flex flex-col justify-between gap-8 p-6 sm:p-8">
          <div className="flex items-center gap-2 text-alabaster-50/50">
            <Crown size={16} strokeWidth={1.5} />
            <span className="text-[11px] font-medium uppercase tracking-[0.14em]">Tablica wyników</span>
          </div>
          <div>
            <p className="text-5xl font-semibold tracking-tight">
              {totalDecided}
              <span className="text-2xl text-alabaster-50/40"> pojedynków</span>
            </p>
            <div className="mt-5 space-y-2">
              {players.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-4 text-sm">
                  <span className="truncate text-alabaster-50/70">{p.name}</span>
                  <span className="shrink-0 font-mono tabular-nums text-alabaster-50/50">
                    <span className="font-medium text-alabaster-50">{p.wins}</span> W · {p.losses} L
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ---------- lista graczy (edycja nazw, maks. 3) ---------- */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 22, delay: 0.05 }}
        className="mt-4"
      >
        <LocalDuelRoster
          players={players}
          onAdd={addPlayer}
          onRename={renamePlayer}
          onRemove={removePlayer}
          canAdd={players.length < maxPlayers}
          canRemove={players.length > minPlayers}
          maxPlayers={maxPlayers}
        />
      </motion.div>

      {/* ---------- scramble ---------- */}
      <div className="mt-8 flex justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={scramble}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-2 text-center font-mono text-sm tracking-wide text-ink-400"
          >
            <Shuffle size={13} strokeWidth={1.5} className="shrink-0" />
            {scramble}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* ---------- arena ---------- */}
      <motion.div
        animate={{ scale: arming ? 1.01 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        // Dotyk (mobile): cała arena = przycisk, ale z zabezpieczeniem — start
        // odpala się tylko przy palcu w miejscu; scroll (ruch palca) anuluje.
        onTouchStart={onArenaTouchStart}
        onTouchMove={onArenaTouchMove}
        onTouchEnd={onArenaTouchEnd}
        onTouchCancel={onArenaTouchEnd}
        className="relative mt-6 min-h-[340px] touch-manipulation select-none [-webkit-touch-callout:none]"
      >
        <DuelBoard phase={phase} displayARef={displayARef} displayBRef={displayBRef} />

        <AnimatePresence>
          {phase === DUEL.FINISHED && (
            <DuelResult times={times} players={players} onSave={handleSave} onReset={newDuel} />
          )}
        </AnimatePresence>
      </motion.div>

      {/* ---------- podpowiedź kontekstowa ---------- */}
      <div className="mt-6 flex h-5 items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={phase}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="text-xs font-medium text-ink-400"
          >
            <span className="hidden md:inline">{HINT[phase][0]}</span>
            <span className="md:hidden">{HINT[phase][1]}</span>
          </motion.p>
        </AnimatePresence>
      </div>

      {/* ---------- historia pojedynków ---------- */}
      {duels.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 text-center text-[10px] font-medium uppercase tracking-[0.14em] text-ink-400">
            Ostatnie pojedynki
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <AnimatePresence initial={false}>
              {duels.slice(0, 6).map((d) => (
                <motion.span
                  key={d.ts}
                  layout
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  className="flex items-center gap-2 rounded-full border border-ink-900/[0.06] bg-white/50 px-3 py-1 text-xs text-ink-500"
                >
                  <Crown size={11} strokeWidth={2} className="text-amber-500" />
                  <span className="font-medium text-ink-900">{d.winnerName}</span>
                  <span className="font-mono tabular-nums text-ink-900">{formatTime(d.winnerTime)}</span>
                  <span className="text-ink-300">·</span>
                  <span className="text-ink-400">{d.loserName}</span>
                  <span className="font-mono tabular-nums text-ink-400">{formatTime(d.loserTime)}</span>
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  )
}
