import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Check, Trophy } from 'lucide-react'
import { evaluateAchievements } from '../../lib/achievements'

/**
 * MilestonesRow — rząd bento z celami/osiągnięciami.
 * Status liczony przez useMemo → przelicza się tylko przy zmianie `solves`.
 *
 * Estetyka: ultra-cienki pasek postępu (h-1, jasnoszare tło, wypełnienie
 * w aksamitnej czerni). Po zaliczeniu — subtelny ptaszek i lekkie
 * przygaszenie kafla, zero jaskrawych kolorów.
 */

function MilestoneCard({ a, index }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 22, delay: 0.05 * index }}
      className={`tile p-6 transition-opacity duration-500 ${a.done ? 'opacity-90' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-ink-400">
          <Trophy size={15} strokeWidth={1.5} />
          <span className="text-[10px] font-medium uppercase tracking-[0.14em]">Milestone</span>
        </div>

        {/* znacznik ukończenia — czarny krążek z ptaszkiem */}
        <motion.span
          initial={false}
          animate={{ scale: a.done ? 1 : 0, opacity: a.done ? 1 : 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-950 text-alabaster-50"
        >
          <Check size={13} strokeWidth={2.5} />
        </motion.span>
      </div>

      <h3 className="mt-4 text-base font-semibold tracking-tight text-ink-950">{a.title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-ink-400">{a.description}</p>

      {/* ultra-cienki pasek postępu */}
      <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-ink-900/[0.06]">
        <motion.div
          className="h-full rounded-full bg-ink-950"
          initial={{ width: 0 }}
          animate={{ width: `${Math.round(a.progress * 100)}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 20 }}
        />
      </div>

      <div className="mt-2.5 flex items-center justify-between text-[11px] text-ink-400">
        <span className="font-mono tabular-nums">{a.detail}</span>
        <span className="font-medium">{a.done ? 'Zaliczone' : `${Math.round(a.progress * 100)}%`}</span>
      </div>
    </motion.article>
  )
}

export default function MilestonesRow({ solves = [] }) {
  const achievements = useMemo(() => evaluateAchievements(solves), [solves])

  return (
    <section className="mt-4">
      <div className="mb-4 flex items-baseline gap-3 px-1">
        <h2 className="text-sm font-semibold tracking-tight text-ink-950">Milestones</h2>
        <span className="text-[11px] font-medium text-ink-400">
          {achievements.filter((a) => a.done).length}/{achievements.length} osiągnięte
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {achievements.map((a, i) => (
          <MilestoneCard key={a.id} a={a} index={i} />
        ))}
      </div>
    </section>
  )
}
