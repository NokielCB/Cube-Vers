import { motion } from 'framer-motion'
import { Check, User, Zap } from 'lucide-react'
import { formatTime } from '../../lib/formatTime'

/**
 * OnlineDuelSide — jedna połowa sieciowej planszy (Ty albo Rywal).
 *
 * Wygląd sterowany polem `state`:
 *   IDLE     → spokojny kafel
 *   HOLDING  → gracz trzyma spację: MATOWY, PULSUJĄCY BLUR (efekt „ładowania")
 *   SOLVING  → układa: żywy, jasny, migający wskaźnik
 *   FINISHED → zamrożony czas z lekkim blurem, akcent emerald
 *
 * Strona rywala dostaje dokładnie te same `state`/`time` co jego własny
 * ekran — bo płyną z serwera w czasie rzeczywistym.
 *
 * @param {{ side:'you'|'opponent', name:string, state:string, time:number|null, display?:React.Ref, winner?:boolean }} props
 */
export default function OnlineDuelSide({ side, name, state, time, displayRef, winner }) {
  const holding = state === 'HOLDING'
  const solving = state === 'SOLVING'
  const finished = state === 'FINISHED'

  return (
    <motion.div
      animate={{
        scale: solving ? 1.01 : finished ? 0.99 : 1,
      }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className={`relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-bento border p-8 backdrop-blur-2xl transition-colors duration-300 lg:p-12 ${
        finished
          ? 'border-emerald-500/25 bg-emerald-50/40'
          : solving
            ? 'border-white/60 bg-white/75'
            : 'border-white/35 bg-white/45'
      } ${winner ? 'ring-2 ring-amber-400/50' : ''}`}
    >
      {/* MATOWY PULSUJĄCY BLUR gdy druga osoba trzyma spację */}
      {holding && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-ink-900/[0.06] backdrop-blur-md"
          animate={{ opacity: [0.35, 0.8, 0.35] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* nagłówek */}
      <div className="relative flex items-center gap-2.5 text-ink-400">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold ${
            finished ? 'bg-emerald-500 text-white' : 'bg-ink-900/[0.06] text-ink-500'
          }`}
        >
          {finished ? <Check size={14} strokeWidth={2.5} /> : <User size={14} strokeWidth={1.8} />}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-[0.14em]">
          {side === 'you' ? 'Ty' : name || 'Rywal'}
        </span>
      </div>

      {/* WIELKI zegar */}
      {side === 'you' ? (
        <span
          ref={displayRef}
          className={`relative my-8 select-none font-mono text-6xl font-medium tabular-nums leading-none tracking-tight transition-all duration-300 sm:text-7xl lg:text-8xl ${
            finished ? 'text-emerald-600 blur-[1.5px]' : 'text-ink-950'
          }`}
        >
          0.00
        </span>
      ) : (
        <span
          className={`relative my-8 select-none font-mono text-6xl font-medium tabular-nums leading-none tracking-tight transition-all duration-300 sm:text-7xl lg:text-8xl ${
            finished ? 'text-emerald-600 blur-[1.5px]' : holding ? 'text-ink-300 blur-[2px]' : 'text-ink-950'
          }`}
        >
          {formatTime(time ?? 0)}
        </span>
      )}

      {/* status */}
      <span
        className={`relative h-4 text-[11px] font-medium uppercase tracking-[0.12em] ${
          finished ? 'text-emerald-600' : 'text-ink-400'
        }`}
      >
        {finished ? 'Ukończono' : solving ? 'Układa…' : holding ? 'Gotuje się…' : 'Czeka'}
      </span>

      {/* migający wskaźnik żywej strony */}
      {solving && (
        <motion.span
          className="absolute right-5 top-5 flex items-center gap-1 text-emerald-500"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Zap size={13} strokeWidth={2} />
        </motion.span>
      )}
    </motion.div>
  )
}
