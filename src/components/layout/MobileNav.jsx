import { motion } from 'framer-motion'
import { LayoutGrid, Regex, SquareStack, Swords, Users } from 'lucide-react'

// Te same zakładki co w Sidebarze — krótkie etykiety pod ikonami,
// bo na telefonie nie ma tooltipów (brak hovera).
// „Duel" to wspólna sekcja (Local + Online) — patrz DuelPage.
const NAV = [
  { id: 'dashboard', label: 'Timer', Icon: LayoutGrid },
  { id: 'algorithms', label: 'Algs', Icon: SquareStack },
  { id: 'duel', label: 'Duel', Icon: Swords },
  { id: 'social', label: 'Social', Icon: Users },
  { id: 'syntax', label: 'Syntax', Icon: Regex },
]

/**
 * MobileNav — dolny, szklany pasek nawigacji (tylko < md; Sidebar jest ukryty).
 *
 *  • position: fixed; bottom: 0 — zawsze pod kciukiem, jak natywny tab bar iOS,
 *  • backdrop-blur + półprzezroczysta biel — spójne z językiem „tile",
 *  • pb-[env(safe-area-inset-bottom)] — oddech nad home-indicatorem iPhone'a,
 *  • aktywna zakładka: biała pigułka (layoutId → płynnie przepływa między
 *    ikonami, ta sama technika co w Sidebarze) + subtelne podświetlenie.
 *
 * Komponent KONTROLOWANY — `active`/`onChange` przychodzą z App, więc Sidebar
 * i MobileNav zawsze wskazują tę samą zakładkę.
 */
export default function MobileNav({ active, onChange }) {
  return (
    <nav
      aria-label="Nawigacja główna"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/40 bg-white/60 pb-[env(safe-area-inset-bottom)] shadow-soft-lg backdrop-blur-2xl md:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1">
        {NAV.map(({ id, label, Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              aria-pressed={isActive}
              aria-label={label}
              className={`relative flex min-w-0 flex-1 touch-manipulation select-none flex-col items-center justify-center gap-0.5 py-2 transition-colors duration-300 ${
                isActive ? 'text-ink-950' : 'text-ink-400 active:text-ink-700'
              }`}
            >
              <span className="relative flex h-8 w-12 items-center justify-center">
                {isActive && (
                  <motion.span
                    layoutId="mobile-nav-active"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    className="absolute inset-0 rounded-full bg-white shadow-soft"
                  />
                )}
                <Icon size={19} strokeWidth={1.6} className="relative" />
              </span>
              <span className="text-[9px] font-medium leading-none tracking-wide">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
