import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Layers, Target } from 'lucide-react'
import { ALGORITHMS, groupsFor } from '../data/algorithms'
import AlgorithmCard from '../components/algorithms/AlgorithmCard'
import FilterBar from '../components/algorithms/FilterBar'

/**
 * AlgorithmsPage — biblioteka algorytmów w układzie bento.
 *
 * Widok STEROWANY: status nauki, nadpisania sekwencji i otwieranie modalu
 * pochodzą z App (props), więc ten sam modal działa też z Mapy. Lokalnie
 * trzymamy tylko stan UI biblioteki: filtry i wyszukiwarkę.
 *
 * @param {{
 *   statuses: Record<string,string>,
 *   onStatusChange: (id:string, s:string)=>void,
 *   movesFor: (alg:object)=>string,
 *   onOpenAlg: (id:string)=>void,
 * }} props
 */
export default function AlgorithmsPage({
  statuses = {},
  onStatusChange,
  movesFor = (a) => a.moves,
  onOpenAlg,
}) {
  const [category, setCategory] = useState('ALL')
  const [group, setGroup] = useState(null)
  const [query, setQuery] = useState('')

  const groups = useMemo(() => groupsFor(category), [category])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ALGORITHMS.filter(
      (a) =>
        (category === 'ALL' || a.category === category) &&
        (!group || a.group === group) &&
        (!q ||
          a.name.toLowerCase().includes(q) ||
          a.moves.toLowerCase().includes(q) ||
          a.caseNumber.toLowerCase().includes(q)),
    )
  }, [category, group, query])

  // Kolejność wg statusu nauki: „w trakcie" na górę, „do nauki" w środku,
  // „nauczone" na sam dół. Sort jest stabilny, więc w obrębie tej samej grupy
  // zachowujemy pierwotną kolejność. Zmiana statusu płynnie przestawia kartę
  // dzięki `layout` + popLayout w gridzie.
  const RANK = { learning: 0, new: 1, mastered: 2 }
  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) => (RANK[statuses[a.id] ?? 'new'] ?? 1) - (RANK[statuses[b.id] ?? 'new'] ?? 1),
      ),
    [filtered, statuses],
  )

  const mastered = ALGORITHMS.filter((a) => statuses[a.id] === 'mastered').length
  const learning = ALGORITHMS.filter((a) => statuses[a.id] === 'learning').length
  const progress = Math.round((mastered / ALGORITHMS.length) * 100)

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-24 md:pt-10 lg:px-10">
      {/* ---------- bento header ---------- */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 22 }}
        className="grid gap-4 lg:grid-cols-3"
      >
        {/* kafel tytułowy */}
        <div className="tile flex flex-col justify-between p-6 sm:p-8 lg:col-span-2 lg:p-10">
          <div className="flex items-center gap-2 text-ink-400">
            <Layers size={16} strokeWidth={1.5} />
            <span className="text-[11px] font-medium uppercase tracking-[0.14em]">
              Algorithm Library
            </span>
          </div>
          <div className="mt-10">
            <h1 className="text-4xl font-semibold tracking-tight text-ink-950 sm:text-5xl">
              Last layer,
              <br />
              <span className="text-ink-400">mastered quietly.</span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-500">
              Every OLL and PLL case in one place. Track what you know, focus on what you
              don&apos;t, and let recognition become instinct.
            </p>
          </div>
        </div>

        {/* czarny kafel postępu — akcent */}
        <div className="tile-dark flex flex-col justify-between gap-8 p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-alabaster-50/50">
              <Target size={16} strokeWidth={1.5} />
              <span className="text-[11px] font-medium uppercase tracking-[0.14em]">
                Progress
              </span>
            </div>
            <ArrowUpRight size={16} strokeWidth={1.5} className="text-alabaster-50/40" />
          </div>

          <div>
            <p className="text-5xl font-semibold tracking-tight">
              {progress}
              <span className="text-2xl text-alabaster-50/40">%</span>
            </p>
            <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-alabaster-50"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', stiffness: 60, damping: 20 }}
              />
            </div>
            <div className="mt-5 flex gap-6 text-xs text-alabaster-50/50">
              <span>
                <span className="font-medium text-alabaster-50">{mastered}</span> mastered
              </span>
              <span>
                <span className="font-medium text-alabaster-50">{learning}</span> learning
              </span>
              <span>
                <span className="font-medium text-alabaster-50">{ALGORITHMS.length}</span> total
              </span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ---------- filtry ---------- */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 120, damping: 22 }}
        className="mt-10"
      >
        <FilterBar
          category={category}
          setCategory={setCategory}
          group={group}
          setGroup={setGroup}
          query={query}
          setQuery={setQuery}
          groups={groups}
        />
      </motion.div>

      {/* ---------- grid kart ---------- */}
      <motion.div layout className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {sorted.map((alg) => (
            <AlgorithmCard
              key={alg.id}
              alg={{ ...alg, moves: movesFor(alg) }}
              status={statuses[alg.id] ?? 'new'}
              onStatusChange={onStatusChange}
              onOpen={(a) => onOpenAlg(a.id)}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      {/* ---------- pusty stan ---------- */}
      <AnimatePresence>
        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="tile mt-6 p-14 text-center"
          >
            <p className="text-lg font-semibold tracking-tight text-ink-900">Nothing here</p>
            <p className="mt-1.5 text-sm text-ink-400">No algorithms match your query.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
