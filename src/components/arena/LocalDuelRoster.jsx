import { motion, AnimatePresence } from 'framer-motion'
import { Users, UserPlus, X } from 'lucide-react'

/**
 * LocalDuelRoster — lista graczy trybu Local Duel (maks. 3). Pozwala zmieniać
 * nazwy (edytowalne pola), dodawać/usuwać graczy i pokazuje bilans W/L, który
 * pamięta się między sesjami (patrz useLocalDuelRoster).
 *
 * @param {{
 *   players: {id:string,name:string,wins:number,losses:number}[],
 *   onAdd:()=>void, onRename:(id,name)=>void, onRemove:(id)=>void,
 *   canAdd:boolean, canRemove:boolean, maxPlayers:number
 * }} props
 */
function initial(name) {
  return (name?.trim()?.[0] ?? '?').toUpperCase()
}

export default function LocalDuelRoster({ players, onAdd, onRename, onRemove, canAdd, canRemove, maxPlayers }) {
  return (
    <section className="tile p-5 sm:p-6">
      <div className="flex items-center justify-between text-ink-400">
        <div className="flex items-center gap-2">
          <Users size={16} strokeWidth={1.5} />
          <span className="text-[11px] font-medium uppercase tracking-[0.14em]">Gracze</span>
        </div>
        <span className="text-[11px] font-medium tabular-nums">
          {players.length}/{maxPlayers}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <AnimatePresence initial={false}>
          {players.map((p) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="relative flex items-center gap-3 rounded-2xl border border-ink-900/[0.06] bg-white/50 p-3"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-900/[0.05] text-sm font-semibold text-ink-600">
                {initial(p.name)}
              </span>
              <div className="min-w-0 flex-1">
                <input
                  value={p.name}
                  onChange={(e) => onRename(p.id, e.target.value)}
                  onBlur={(e) => {
                    if (!e.target.value.trim()) onRename(p.id, 'Gracz')
                  }}
                  maxLength={16}
                  aria-label="Nazwa gracza"
                  className="w-full rounded-md bg-transparent text-sm font-medium text-ink-950 outline-none focus:bg-white/70 focus:px-1.5 focus:py-0.5"
                />
                <span className="mt-0.5 block text-[11px] tabular-nums text-ink-400">
                  {p.wins} W · {p.losses} L
                </span>
              </div>
              {canRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(p.id)}
                  aria-label={`Usuń gracza ${p.name}`}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-ink-300 transition-colors hover:bg-ink-900/[0.05] hover:text-ink-700"
                >
                  <X size={13} strokeWidth={2} />
                </button>
              )}
            </motion.div>
          ))}

          {canAdd && (
            <motion.button
              key="add"
              layout
              type="button"
              onClick={onAdd}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-900/15 p-3 text-sm font-medium text-ink-400 transition-colors hover:border-ink-900/30 hover:text-ink-700"
            >
              <UserPlus size={15} strokeWidth={1.8} /> Dodaj gracza
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
