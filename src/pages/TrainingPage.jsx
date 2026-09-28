import { useCallback, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Target, Trophy } from 'lucide-react'
import TimerCard from '../components/timer/TimerCard'
import CubeDiagram from '../components/cube/CubeDiagram'
import Notation from '../components/algorithms/Notation'
import { getAlternatives } from '../data/algorithmDetails'
import { formatTime } from '../lib/formatTime'
import { invertSequence } from '../lib/notation'
import { pbSingle, sessionMean } from '../lib/stats'

/**
 * TrainingPage — dedykowana sesja treningu JEDNEGO algorytmu w zakładce Timera.
 *
 * Jak to działa:
 *  - setup = odwrotność sekwencji wariantu (invertSequence): wykonany na
 *    ułożonej kostce daje dokładnie ten przypadek, który wariant rozwiązuje,
 *  - każda próba ląduje TYLKO w pamięci tej strony (`attemptsBy`) — nie
 *    trafia do historii ułożeń, sesji ani statystyk Dashboardu,
 *  - trwały jest wyłącznie najlepszy czas: gdy próba go bije, wołamy
 *    `onRecord` (App zapisuje go w localStorage),
 *  - rekord i próby są osobne dla KAŻDEGO wariantu (klucz = sekwencja ruchów).
 *
 * @param {{
 *   alg: object,                       // algorytm z bazy (ALGORITHMS)
 *   moves: string,                     // trenowany wariant (sekwencja)
 *   pbs: Record<string, number>,       // rekordy wariantów tego algorytmu
 *   onRecord: (id:string, moves:string, ms:number)=>void,
 *   onVariantChange: (moves:string)=>void,
 *   onExit: ()=>void,
 * }} props
 */
export default function TrainingPage({ alg, moves, pbs = {}, onRecord, onVariantChange, onExit }) {
  // Próby tej sesji: { [sekwencja wariantu]: [{ ms, ts, status }] } — najnowsza pierwsza.
  // Osobno per wariant, więc przełączanie w tę i z powrotem niczego nie miesza.
  const [attemptsBy, setAttemptsBy] = useState({})
  // Wariant, w którym OSTATNIA próba pobiła rekord — do podświetlenia „Nowy rekord".
  const [freshPb, setFreshPb] = useState(null)

  const alternatives = useMemo(() => getAlternatives(alg), [alg])
  const variant = alternatives.find((a) => a.moves === moves) ?? alternatives[0]
  const setup = useMemo(() => invertSequence(moves), [moves])
  const attempts = attemptsBy[moves] ?? []
  const pb = pbs[moves] ?? null

  const handleSolve = useCallback(
    (ms) => {
      const time = Math.round(ms)
      setAttemptsBy((prev) => ({
        ...prev,
        [moves]: [{ ms: time, ts: Date.now(), status: 'OK' }, ...(prev[moves] ?? [])],
      }))
      if (pb == null || time < pb) {
        onRecord(alg.id, moves, time)
        setFreshPb(moves)
      } else {
        setFreshPb(null)
      }
    },
    [alg.id, moves, pb, onRecord],
  )

  const changeVariant = (next) => {
    setFreshPb(null)
    onVariantChange(next)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-24 md:pt-10 lg:px-10">
      {/* nagłówek — wyjście po lewej, bo prawy górny róg zajmuje awatar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 22 }}
        className="mb-6 flex items-center gap-3 pr-16 sm:pr-40"
      >
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={onExit}
          aria-label="Zakończ trening"
          title="Zakończ trening"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/50 text-ink-500 shadow-soft backdrop-blur-2xl transition-colors hover:text-ink-950"
        >
          <ArrowLeft size={17} strokeWidth={1.75} />
        </motion.button>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-ink-400">
            Trening · {alg.category} {alg.caseNumber}
          </p>
          <h1 className="truncate text-2xl font-semibold tracking-tight text-ink-950">{alg.name}</h1>
        </div>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TimerCard solves={attempts} onSolve={handleSolve} setup={setup} pb={pb} label="Trening" />
        </div>

        {/* ——— panel algorytmu: rekord, sekwencja, warianty, ta sesja ——— */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 22, delay: 0.05 }}
          className="tile flex h-full flex-col p-6 sm:p-8 lg:col-span-1"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-ink-400">
              <Target size={16} strokeWidth={1.5} />
              <span className="text-[11px] font-medium uppercase tracking-[0.14em]">Algorytm</span>
            </div>
            <div className="shrink-0 rounded-xl bg-white/30 p-1">
              <CubeDiagram pattern={alg.pattern} className="h-11 w-11" />
            </div>
          </div>

          {/* rekord trenowanego wariantu — jedyna rzecz, którą zapisujemy */}
          <div className="mt-6">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-400">
              Twój PB
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-4xl font-medium tabular-nums tracking-tight text-ink-950">
                {formatTime(pb)}
              </span>
              <AnimatePresence>
                {freshPb === moves && (
                  <motion.span
                    key={pb}
                    initial={{ opacity: 0, scale: 0.9, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                    className="flex items-center gap-1 rounded-full bg-ochre/20 px-2.5 py-1 text-[11px] font-semibold text-amber-800"
                  >
                    <Trophy size={12} strokeWidth={2} /> Nowy rekord
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-400">
              Wykonaj
            </p>
            <Notation moves={moves} />
          </div>

          {/* warianty — każdy z własnym rekordem */}
          <div className="mt-6">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-400">
              Wariant
            </p>
            <div className="flex flex-col gap-1.5">
              {alternatives.map((alt) => {
                const selected = alt.moves === variant.moves
                return (
                  <button
                    key={alt.moves}
                    type="button"
                    onClick={() => !selected && changeVariant(alt.moves)}
                    aria-pressed={selected}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors duration-200 ${
                      selected
                        ? 'cursor-default border-transparent bg-ink-950 text-alabaster-50'
                        : 'border-ink-900/[0.06] bg-white/40 text-ink-600 hover:border-ink-900/15 hover:text-ink-950'
                    }`}
                  >
                    <span className="truncate text-xs font-medium">{alt.label}</span>
                    <span
                      className={`shrink-0 font-mono text-xs tabular-nums ${
                        selected ? 'text-alabaster-50/60' : 'text-ink-400'
                      }`}
                    >
                      {formatTime(pbs[alt.moves])}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ta sesja — tylko w pamięci, przyklejona do dołu jak trend w StatsCard */}
          <div className="mt-auto pt-8">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-400">Ta sesja</p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <SessionMetric label="Próby" value={attempts.length} />
              <SessionMetric label="Najlepsza" value={formatTime(pbSingle(attempts))} />
              <SessionMetric label="Średnia" value={formatTime(sessionMean(attempts))} />
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-ink-400">
              Zapisujemy tylko najlepszy czas. Próby z tej sesji znikną po wyjściu.
            </p>
          </div>
        </motion.section>
      </div>
    </div>
  )
}

function SessionMetric({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-400">{label}</span>
      <span className="font-mono text-base font-medium tabular-nums text-ink-950">{value}</span>
    </div>
  )
}
