import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { UserRound } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import SettingsModal from './SettingsModal'

/**
 * ProfileMenu — szklany awatar w prawym górnym rogu. Zalogowany widzi swoje
 * inicjały, Gość elegancką ikonę. Klik otwiera modal ustawień.
 */
function initials(user) {
  const src = user?.displayName || user?.email || ''
  const base = src.split('@')[0]
  const parts = base.split(/[.\s_-]+/).filter(Boolean)
  const letters = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
  return letters.toUpperCase() || base.slice(0, 2).toUpperCase()
}

export default function ProfileMenu() {
  const { user, isGuest } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* max() — awatar nigdy nie wjeżdża pod notch (viewport-fit=cover) */}
      <div className="fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-40 flex items-center gap-2">
        {isGuest && (
          <span className="hidden rounded-full border border-white/25 bg-white/40 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-400 shadow-soft backdrop-blur-2xl sm:inline">
            Gość
          </span>
        )}
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => setOpen(true)}
          title="Ustawienia konta"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/50 text-ink-700 shadow-soft backdrop-blur-2xl transition-colors hover:border-white/60"
        >
          {isGuest ? (
            <UserRound size={17} strokeWidth={1.6} className="text-ink-400" />
          ) : (
            <span className="text-xs font-semibold tracking-tight text-ink-900">{initials(user)}</span>
          )}
        </motion.button>
      </div>

      <AnimatePresence>{open && <SettingsModal onClose={() => setOpen(false)} />}</AnimatePresence>
    </>
  )
}
