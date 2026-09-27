import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { DUEL } from '../../hooks/useDuelTimer'

/**
 * DuelBoard — dzielony ekran pojedynku (dwie połowy bento) z jednym,
 * WSPÓLNYM zegarem.
 *
 * Uczciwy model dla jednej klawiatury: połowy reprezentują KOLEJNOŚĆ FINISZU,
 * a nie konkretnego gracza. Nie da się wiedzieć „z boku", kto wcisnął spację —
 * wiadomo tylko, że pierwszy klik = Czas A, drugi = Czas B. Przypisanie do
 * Gracza 1/2 robimy dopiero PO meczu (DuelResult).
 *
 *   RUNNING_BOTH   → obie połowy żywe (obaj jeszcze układają)
 *   RUNNING_SECOND → połowa „Pierwszy finisz" zamrożona + rozmyta, druga biegnie
 */

const HALF = {
  a: { badge: '1', title: 'Pierwszy finisz', hint: 'zamraża się przy 1. spacji' },
  b: { badge: '2', title: 'Drugi finisz', hint: 'zamraża się przy 2. spacji' },
}

function stateFor(side, phase) {
  if (phase === DUEL.RUNNING_BOTH) return 'live'
  if (phase === DUEL.RUNNING_SECOND) return side === 'a' ? 'frozen' : 'live'
  if (phase === DUEL.FINISHED) return 'frozen'
  return 'idle' // idle / holding / ready
}

function Half({ side, phase, displayRef }) {
  const meta = HALF[side]
  const state = stateFor(side, phase)
  const frozen = state === 'frozen'
  const live = state === 'live'

  return (
    <motion.div
      animate={{
        scale: live ? 1 : frozen ? 0.985 : 1,
        opacity: frozen ? 0.9 : 1,
      }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className={`relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-bento border p-6 backdrop-blur-2xl transition-colors duration-300 sm:p-8 lg:p-12 ${
        frozen
          ? 'border-emerald-500/25 bg-emerald-50/40'
          : live
            ? 'border-white/50 bg-white/70'
            : 'border-white/35 bg-white/45'
      }`}
    >
      {/* nagłówek połowy */}
      <div className="flex items-center gap-2.5 text-ink-400">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold ${
            frozen ? 'bg-emerald-500 text-white' : 'bg-ink-900/[0.06] text-ink-500'
          }`}
        >
          {frozen ? <Check size={14} strokeWidth={2.5} /> : meta.badge}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-[0.14em]">{meta.title}</span>
      </div>

      {/* WIELKI zegar — pisany przez ref z hooka, bez re-renderów */}
      <span
        ref={displayRef}
        className={`my-6 select-none font-mono text-5xl font-medium tabular-nums leading-none tracking-tight transition-all duration-300 sm:my-8 sm:text-7xl lg:text-8xl ${
          frozen ? 'text-emerald-600 blur-[1.5px]' : 'text-ink-950'
        }`}
      >
        0.00
      </span>

      {/* status pod zegarem */}
      <span
        className={`h-4 text-[11px] font-medium uppercase tracking-[0.12em] ${
          frozen ? 'text-emerald-600' : 'text-ink-400'
        }`}
      >
        {frozen ? 'Ukończono' : live ? 'Układa…' : meta.hint}
      </span>

      {/* subtelny puls żywej połowy */}
      {live && (
        <motion.span
          className="absolute right-5 top-5 h-2 w-2 rounded-full bg-emerald-500"
          animate={{ opacity: [1, 0.25, 1] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </motion.div>
  )
}

export default function DuelBoard({ phase, displayARef, displayBRef }) {
  return (
    <div className="relative flex flex-col gap-4 lg:flex-row">
      <Half side="a" phase={phase} displayRef={displayARef} />

      {/* środkowy znacznik VS */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 lg:block">
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/80 font-mono text-xs font-semibold tracking-wide text-ink-500 shadow-soft backdrop-blur-2xl">
          VS
        </span>
      </div>

      <Half side="b" phase={phase} displayRef={displayBRef} />
    </div>
  )
}
