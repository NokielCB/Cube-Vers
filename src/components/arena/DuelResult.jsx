import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Crown, RotateCcw, User } from 'lucide-react'
import { formatTime } from '../../lib/formatTime'

/**
 * DuelResult — szklany panel PO meczu: przypisanie czasów do NAZWANYCH graczy,
 * a potem podsumowanie ze zwycięzcą.
 *
 * Kluczowa obserwacja: pierwszy split (Czas A) jest z definicji mierzony
 * wcześniej niż drugi (Czas B) z tego samego startu, więc A ≤ B ZAWSZE.
 * „Kto ukończył pierwszy?" = do kogo należy Czas A — i ten gracz wygrywa.
 *
 * Obsługa puli graczy (2–3):
 *   • Krok 1: wybierz zwycięzcę (Czas A) spośród wszystkich graczy.
 *   • Krok 1b (tylko gdy graczy > 2): wybierz drugiego zawodnika (Czas B)
 *     spośród pozostałych.
 *   • Przy 2 graczach drugi zawodnik dobiera się automatycznie.
 *
 * @param {{
 *   times:{a:number,b:number},
 *   players:{id:string,name:string}[],
 *   onSave:(d:object)=>void, onReset:()=>void
 * }} props
 */
export default function DuelResult({ times, players = [], onSave, onReset }) {
  const [winnerId, setWinnerId] = useState(null) // właściciel Czasu A (zwycięzca)
  const [loserId, setLoserId] = useState(null) // właściciel Czasu B
  const savedRef = useRef(false)

  const timeA = times.a ?? 0
  const timeB = times.b ?? 0
  const gap = timeB - timeA
  const twoPlayers = players.length <= 2

  // Przy 2 graczach przegrany to po prostu „ten drugi".
  const effLoserId = useMemo(() => {
    if (loserId) return loserId
    if (twoPlayers && winnerId) return players.find((p) => p.id !== winnerId)?.id ?? null
    return null
  }, [loserId, twoPlayers, winnerId, players])

  const winner = players.find((p) => p.id === winnerId)
  const loser = players.find((p) => p.id === effLoserId)
  const done = !!(winnerId && effLoserId)

  // Zapis do historii dokładnie RAZ, w chwili kompletu przypisań.
  useEffect(() => {
    if (!done || savedRef.current || !winner || !loser) return
    savedRef.current = true
    onSave({
      ts: Date.now(),
      winnerId: winner.id,
      loserId: loser.id,
      winnerName: winner.name,
      loserName: loser.name,
      winnerTime: timeA,
      loserTime: timeB,
      gap,
    })
  }, [done, winner, loser, timeA, timeB, gap, onSave])

  // Enter → nowy pojedynek (gdy komplet). Wybór graczy robimy klikając.
  useEffect(() => {
    const onKey = (e) => {
      if (done && e.key === 'Enter') onReset()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [done, onReset])

  // Który krok pokazać.
  const step = !winnerId ? 'winner' : !done ? 'second' : 'summary'
  const remaining = players.filter((p) => p.id !== winnerId)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-20 flex items-center justify-center p-4 backdrop-blur-2xl"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="w-full max-w-xl overflow-hidden rounded-bento border border-white/50 bg-white/75 p-8 shadow-soft-lg backdrop-blur-2xl lg:p-10"
      >
        <AnimatePresence mode="wait">
          {step !== 'summary' ? (
            /* ——— KROK 1 / 1b: przypisanie ——— */
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              <p className="text-center text-[11px] font-medium uppercase tracking-[0.14em] text-ink-400">
                {step === 'winner' ? 'Zarejestrowano dwa czasy' : `Zwycięzca: ${winner?.name}`}
              </p>
              <h2 className="mt-1 text-center text-2xl font-semibold tracking-tight text-ink-950">
                {step === 'winner' ? 'Kto ukończył jako pierwszy?' : 'Kto był drugim zawodnikiem?'}
              </h2>

              <div
                className={`mt-8 grid gap-4 ${
                  (step === 'winner' ? players.length : remaining.length) >= 3
                    ? 'grid-cols-3'
                    : 'grid-cols-2'
                }`}
              >
                {(step === 'winner' ? players : remaining).map((p) => (
                  <AssignButton
                    key={p.id}
                    name={p.name}
                    onPick={() => (step === 'winner' ? setWinnerId(p.id) : setLoserId(p.id))}
                  />
                ))}
              </div>

              <div className="mt-6 flex items-center justify-center gap-3 text-xs text-ink-400">
                <span className="rounded-full border border-ink-900/[0.06] bg-white/50 px-3 py-1 font-mono tabular-nums">
                  1. finisz {formatTime(timeA)}
                </span>
                <span className="rounded-full border border-ink-900/[0.06] bg-white/50 px-3 py-1 font-mono tabular-nums">
                  2. finisz {formatTime(timeB)}
                </span>
              </div>
            </motion.div>
          ) : (
            /* ——— KROK 2: podsumowanie ze zwycięzcą ——— */
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              <div className="grid grid-cols-2 gap-4">
                <PlayerCard name={winner?.name} time={timeA} won />
                <PlayerCard name={loser?.name} time={timeB} won={false} />
              </div>

              <p className="mt-6 text-center text-sm text-ink-500">
                Wygrana o <span className="font-mono font-medium text-ink-900">{formatTime(gap)}</span>
              </p>

              <button
                onClick={onReset}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-ink-950 px-5 py-3 text-sm font-medium text-alabaster-50 transition-opacity duration-200 hover:opacity-90"
              >
                <RotateCcw size={15} strokeWidth={2} /> Nowy pojedynek
                <span className="ml-1 text-alabaster-50/50">Enter</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

function AssignButton({ name, onPick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -2 }}
      onClick={onPick}
      className="flex flex-col items-center gap-3 rounded-3xl border border-ink-900/[0.06] bg-white/50 p-6 transition-colors duration-200 hover:border-ink-900/20"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-900/[0.05] text-ink-500">
        <User size={24} strokeWidth={1.5} />
      </span>
      <span className="max-w-full truncate text-sm font-medium text-ink-950">{name}</span>
    </motion.button>
  )
}

function PlayerCard({ name, time, won }) {
  return (
    <motion.div
      animate={{ scale: won ? 1 : 0.97, opacity: won ? 1 : 0.72 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className={`relative flex flex-col items-center gap-3 rounded-3xl border p-6 ${
        won ? 'border-amber-400/40 bg-amber-50/50' : 'border-ink-900/[0.06] bg-white/45'
      }`}
    >
      {won && (
        <span className="absolute -top-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-950 shadow-soft">
          <Crown size={11} strokeWidth={2.5} /> Winner
        </span>
      )}
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-full ${
          won ? 'bg-amber-400/25 text-amber-700' : 'bg-ink-900/[0.05] text-ink-400'
        }`}
      >
        <User size={20} strokeWidth={1.5} />
      </span>
      <span className="max-w-full truncate text-xs font-medium text-ink-500">{name}</span>
      <span
        className={`font-mono text-2xl font-semibold tabular-nums ${
          won ? 'text-amber-700' : 'text-ink-900'
        }`}
      >
        {formatTime(time)}
      </span>
    </motion.div>
  )
}
