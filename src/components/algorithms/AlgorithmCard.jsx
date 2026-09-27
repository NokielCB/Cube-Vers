import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import CubeDiagram from '../cube/CubeDiagram'

/**
 * AlgorithmCard — kafelek bento w estetyce ultra-minimal premium.
 *
 * Zasady: żadnych neonów i tiltów. Interakcja jest cicha —
 * delikatne uniesienie (y: -4) i pogłębienie miękkiego cienia.
 * Hierarchia robi robotę: duża nazwa, drobne szare metadane.
 */

const STATUS_ORDER = ['new', 'learning', 'mastered']
const STATUS_UI = {
  new: { label: 'To learn', cls: 'border-ink-900/10 bg-transparent text-ink-500' },
  learning: { label: 'Learning', cls: 'border-ink-900/10 bg-white/60 text-ink-700' },
  mastered: { label: 'Mastered', cls: 'border-transparent bg-ink-950 text-alabaster-50' },
}

/** Notacja — spokojne "klawisze" w jednym kolorze, akcent samą wagą fontu. */
function Notation({ moves }) {
  return (
    <div className="flex flex-wrap gap-1.5 font-mono text-[13px] text-ink-700">
      {moves.split(' ').map((m, i) => (
        <span
          key={`${m}-${i}`}
          className="rounded-lg border border-ink-900/[0.06] bg-ink-900/[0.03] px-1.5 py-0.5"
        >
          {m}
        </span>
      ))}
    </div>
  )
}

function Difficulty({ n }) {
  return (
    <div className="mt-2 flex gap-1" title={`Difficulty ${n}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`h-1 w-4 rounded-full ${i < n ? 'bg-ink-900' : 'bg-ink-900/10'}`}
        />
      ))}
    </div>
  )
}

function StatusBadge({ status, onChange }) {
  const ui = STATUS_UI[status]
  const next = STATUS_ORDER[(STATUS_ORDER.indexOf(status) + 1) % STATUS_ORDER.length]
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={(e) => {
        e.stopPropagation()
        onChange(next)
      }}
      className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors duration-300 ${ui.cls}`}
      title="Kliknij, aby zmienić status nauki"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={status}
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -8, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-1.5"
        >
          {status === 'mastered' && <Check size={13} strokeWidth={1.5} />}
          {ui.label}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}

export default function AlgorithmCard({ alg, status = 'new', onStatusChange, onOpen }) {
  // Nauczone karty lekko szarzeją i blakną (opadają na dół listy w rodzicu),
  // ale po najechaniu wracają do pełni kolorów — nadal łatwo je przejrzeć.
  const mastered = status === 'mastered'
  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
      whileHover={{ y: -4 }}
      // Osobna, „miękka" sprężyna dla przemieszczania (layout): karta płynnie
      // przesuwa się na górę/dół przy zmianie statusu, z lekkim wyhamowaniem
      // (niższy damping = delikatny „odbój" na końcu = ruch jest wyraźnie widać).
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 28,
        layout: { type: 'spring', stiffness: 260, damping: 24, mass: 0.9 },
      }}
      onClick={() => onOpen?.(alg)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          onOpen?.(alg)
        }
      }}
      className={`tile group cursor-pointer p-6 transition-all duration-500 hover:shadow-soft-lg ${
        mastered ? 'opacity-60 saturate-[0.55] hover:opacity-100 hover:saturate-100' : ''
      }`}
    >
      <div className="flex items-start gap-5">
        {/* diagram — tło wtapia się w szkło karty */}
        <div className="shrink-0 rounded-2xl bg-white/30 p-1.5">
          <CubeDiagram pattern={alg.pattern} className="h-[76px] w-[76px]" />
        </div>
        <div className="min-w-0 flex-1 pt-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-400">
            {alg.category} · {alg.caseNumber}
          </p>
          <h3 className="mt-1 truncate text-lg font-semibold tracking-tight text-ink-950">
            {alg.name}
          </h3>
          <Difficulty n={alg.difficulty} />
        </div>
      </div>

      <div className="mt-5">
        <Notation moves={alg.moves} />
      </div>

      <div className="mt-5 flex items-center justify-between">
        <StatusBadge status={status} onChange={(s) => onStatusChange(alg.id, s)} />
        <span className="text-[11px] font-medium text-ink-400">{alg.group}</span>
      </div>
    </motion.article>
  )
}
