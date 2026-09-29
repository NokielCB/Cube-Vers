import { motion } from 'framer-motion'
import { Box, LayoutGrid, Regex, SquareStack, Swords, Users } from 'lucide-react'

// Realne zakładki. Trzymamy rail wąski i przestronny — bez martwych ikon.
// „Duel" łączy dawny Local Duel + Online Duel w jedną sekcję (patrz DuelPage).
const NAV = [
  { id: 'dashboard', label: 'Dashboard / Timer', Icon: LayoutGrid },
  { id: 'algorithms', label: 'Learn / Algs', Icon: SquareStack },
  { id: 'duel', label: 'Duel · Local & Online', Icon: Swords },
  { id: 'social', label: 'Social Hub', Icon: Users },
  { id: 'syntax', label: 'Cube Syntax', Icon: Regex },
]

/**
 * Sidebar — jasna, szklista szyna nawigacji. Komponent KONTROLOWANY:
 * aktywną zakładką zarządza App (`active` + `onChange`), więc nawigacja i
 * treść zawsze są w jednym źródle prawdy.
 *
 * Aktywna pozycja dostaje białą „pigułkę" z miękkim cieniem; `layoutId`
 * sprawia, że pigułka płynnie przepływa między ikonami.
 */
export default function Sidebar({ active, onChange }) {
  return (
    <aside className="fixed inset-y-4 left-4 z-40 hidden w-[68px] flex-col items-center rounded-bento border border-white/25 bg-white/40 py-6 shadow-soft backdrop-blur-2xl md:flex">
      <Box size={26} strokeWidth={1.25} className="text-ink-950" aria-label="CubeVerse" />

      <nav className="mt-10 flex flex-1 flex-col gap-1.5">
        {NAV.map(({ id, label, Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              aria-pressed={isActive}
              className={`group relative flex h-11 w-11 items-center justify-center rounded-2xl transition-colors duration-300 ${
                isActive ? 'text-ink-950' : 'text-ink-400 hover:text-ink-700'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="nav-active"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  className="absolute inset-0 rounded-2xl bg-white shadow-soft"
                />
              )}
              <Icon size={20} strokeWidth={1.5} className="relative" />

              {/* tooltip */}
              <span className="pointer-events-none absolute left-full ml-3 origin-left scale-95 whitespace-nowrap rounded-xl bg-ink-950 px-3 py-1.5 text-xs font-medium text-alabaster-50 opacity-0 shadow-soft-lg transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
                {label}
              </span>
            </button>
          )
        })}
      </nav>

      <span className="h-1.5 w-1.5 rounded-full bg-ink-950" title="Session live" />
      {/* mobile (< md): tę szynę zastępuje MobileNav (dolny tab bar) */}
    </aside>
  )
}
