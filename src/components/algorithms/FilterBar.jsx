import { AnimatePresence, motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { CATEGORIES } from '../../data/algorithms'

/**
 * FilterBar — segmented control w duchu iOS (biała pigułka + miękki cień)
 * i chipy grup z włoskowatym borderem. Monochrom, zero koloru.
 */
export default function FilterBar({
  category,
  setCategory,
  group,
  setGroup,
  query,
  setQuery,
  groups,
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* segmented control */}
        <div className="flex rounded-full border border-ink-900/[0.06] bg-ink-900/[0.04] p-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => {
                setCategory(c)
                setGroup(null)
              }}
              className={`relative rounded-full px-5 py-2 text-xs font-medium transition-colors duration-300 ${
                category === c ? 'text-ink-950' : 'text-ink-500 hover:text-ink-700'
              }`}
            >
              {category === c && (
                <motion.span
                  layoutId="seg-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-full bg-white shadow-soft"
                />
              )}
              <span className="relative">{c}</span>
            </button>
          ))}
        </div>

        {/* wyszukiwarka */}
        <div className="flex min-w-[220px] flex-1 items-center gap-2.5 rounded-full border border-ink-900/[0.06] bg-white/50 px-4 py-2.5 backdrop-blur-xl transition-colors focus-within:border-ink-900/20 sm:max-w-xs">
          <Search size={15} strokeWidth={1.5} className="text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search algorithms…"
            className="w-full bg-transparent text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
          />
        </div>
      </div>

      {/* chipy grup */}
      <motion.div layout className="flex min-h-[34px] flex-wrap items-center gap-2">
        <AnimatePresence mode="popLayout">
          {groups.map((g) => {
            const active = group === g
            return (
              <motion.button
                key={g}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={() => setGroup(active ? null : g)}
                className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors duration-300 ${
                  active
                    ? 'border-transparent bg-ink-950 text-alabaster-50'
                    : 'border-ink-900/10 bg-transparent text-ink-500 hover:border-ink-900/25 hover:text-ink-900'
                }`}
              >
                {g}
              </motion.button>
            )
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
