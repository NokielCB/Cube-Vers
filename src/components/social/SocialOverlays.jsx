import { AnimatePresence, motion } from 'framer-motion'
import { Bell, Swords, X } from 'lucide-react'
import { useSocial } from '../../context/SocialContext'

/**
 * SocialOverlays — globalne, „pływające" UI systemu społecznościowego, montowane
 * RAZ na poziomie App (nad wszystkimi zakładkami), żeby wyzwanie / powiadomienie
 * dotarło do gracza niezależnie od tego, gdzie akurat jest w apce.
 *
 *  • DuelInvitation — szklany modal Accept/Decline na przychodzące wyzwanie,
 *  • Notice — ulotny toast (nowe zaproszenie do znajomych, odrzucone wyzwanie…).
 */
export default function SocialOverlays() {
  const { invitation, respondInvitation, notice, dismissNotice } = useSocial()

  return (
    <>
      <AnimatePresence>
        {invitation && (
          <DuelInvitation
            invitation={invitation}
            onAccept={() => respondInvitation(true)}
            onDecline={() => respondInvitation(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notice && <Notice notice={notice} onDismiss={dismissNotice} />}
      </AnimatePresence>
    </>
  )
}

function DuelInvitation({ invitation, onAccept, onDecline }) {
  const who = invitation.fromName || (invitation.fromUsername ? `@${invitation.fromUsername}` : 'Gracz')
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onDecline}
      // mobile: bottom sheet (items-end, bez paddingu — panel dokleja się do
      // dolnej krawędzi); sm+: klasyczny wyśrodkowany modal
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink-950/30 backdrop-blur-xl sm:items-center sm:p-4"
    >
      <motion.div
        initial={{ scale: 0.97, opacity: 0, y: 48 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0, y: 48 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
        className="tile w-full !rounded-b-none p-7 pb-[calc(1.75rem+env(safe-area-inset-bottom))] text-center sm:max-w-sm sm:!rounded-b-bento sm:pb-7"
      >
        {/* uchwyt bottom sheeta — tylko mobile */}
        <span className="mx-auto mb-4 block h-1 w-10 rounded-full bg-ink-900/15 sm:hidden" />
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ink-950 text-alabaster-50"
        >
          <Swords size={24} strokeWidth={1.8} />
        </motion.div>

        <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-400">
          Wyzwanie na pojedynek
        </p>
        <h3 className="mt-1 text-xl font-semibold tracking-tight text-ink-950">
          <span className="font-mono">{who}</span> rzuca Ci wyzwanie
        </h3>
        <p className="mt-2 text-sm text-ink-500">
          Zaakceptuj, aby natychmiast przejść do Areny i zmierzyć się 1v1.
        </p>

        <div className="mt-6 flex gap-2.5">
          <button
            onClick={onDecline}
            className="flex-1 rounded-xl border border-ink-900/[0.08] bg-white/60 px-4 py-2.5 text-sm font-medium text-ink-600 transition-colors hover:bg-white/80"
          >
            Odrzuć
          </button>
          <button
            onClick={onAccept}
            className="flex flex-[1.4] items-center justify-center gap-2 rounded-xl bg-ink-950 px-4 py-2.5 text-sm font-medium text-alabaster-50 transition-opacity hover:opacity-90"
          >
            <Swords size={15} strokeWidth={2} /> Akceptuj
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Notice({ notice, onDismiss }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      // mobile: nad dolnym paskiem nawigacji (+ safe area); md+: przy krawędzi
      className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-[65] flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-2xl border border-white/50 bg-white/80 px-4 py-3 shadow-soft-lg backdrop-blur-2xl md:bottom-6"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-900/[0.05] text-ink-500">
        <Bell size={14} strokeWidth={1.8} />
      </span>
      <span className="text-sm font-medium text-ink-800">{notice.text}</span>
      <button
        onClick={onDismiss}
        aria-label="Zamknij"
        className="ml-1 flex h-6 w-6 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-900/[0.05] hover:text-ink-700"
      >
        <X size={13} strokeWidth={2} />
      </button>
    </motion.div>
  )
}
