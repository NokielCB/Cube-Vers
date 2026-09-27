import { Fragment, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ListOrdered, Plus, Pencil, Trash2, Check, X, ChevronDown, Shuffle } from 'lucide-react'
import { useSessions } from '../../context/SessionContext'
import { useData } from '../../context/DataContext'
import { formatResult } from '../../lib/formatTime'

/**
 * SolvesPanel — kafel „Times": pasek sesji (przełączanie / dodawanie / zmiana
 * nazwy / usuwanie) + tabela ostatnich czasów aktywnej sesji z akcjami na
 * pojedynczym wyniku (+2, DNF, usuń).
 *
 * Komponent jest samowystarczalny: sesje i statusy bierze z SessionContext,
 * a usuwanie czasu z DataContext (to samo źródło, co reszta apki). `solves`
 * (prop) to PEŁNA, kanoniczna historia — filtrujemy ją tu po aktywnej sesji.
 */

function clockOf(ts) {
  try {
    return new Date(ts).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function dateOf(ts) {
  try {
    return new Date(ts).toLocaleString('pl-PL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

/** Mały przycisk-akcja w wierszu tabeli. `stopPropagation`, żeby nie rozwijać wiersza. */
function RowAction({ active, activeClass, onClick, children, label }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-label={label}
      className={`flex h-8 min-w-[34px] items-center justify-center rounded-lg px-2 text-[11px] font-semibold tabular-nums transition-colors duration-150 ${
        active ? activeClass : 'text-ink-400 hover:bg-ink-900/[0.05] hover:text-ink-950'
      }`}
    >
      {children}
    </button>
  )
}

export default function SolvesPanel({ solves = [] }) {
  const { sessions, activeId, setActiveId, addSession, renameSession, removeSession, sessionIdOf, statusOf, setStatus, forget } =
    useSessions()
  const { deleteSolve } = useData()

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [expandedId, setExpandedId] = useState(null) // rozwinięty wiersz (podgląd scramble)
  const toggleExpand = (id) => setExpandedId((cur) => (cur === id ? null : id))

  const activeName = sessions.find((s) => s.id === activeId)?.name ?? 'Główna'

  // Czasy aktywnej sesji (najnowsze pierwsze) + doklejony status.
  const rows = useMemo(
    () => solves.filter((s) => sessionIdOf(s.id) === activeId).map((s) => ({ ...s, status: statusOf(s.id) })),
    [solves, activeId, sessionIdOf, statusOf],
  )
  const total = rows.length

  const handleAdd = () => addSession(`Sesja ${sessions.length}`)

  const startEdit = () => {
    setDraft(activeName)
    setEditing(true)
  }
  const saveEdit = () => {
    renameSession(activeId, draft)
    setEditing(false)
  }
  const handleDelete = () => {
    const s = sessions.find((x) => x.id === activeId)
    if (!s || s.id === 'default') return
    if (window.confirm(`Usunąć sesję „${s.name}"? Jej czasy wrócą do „Głównej".`)) removeSession(s.id)
  }

  const toggle = (id, current, target) => setStatus(id, current === target ? 'OK' : target)
  const remove = async (id) => {
    await deleteSolve(id)
    forget(id)
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 22, delay: 0.05 }}
      className="tile mt-4 flex flex-col p-5 sm:p-6 lg:p-8"
    >
      {/* nagłówek */}
      <div className="flex items-center justify-between text-ink-400">
        <div className="flex items-center gap-2">
          <ListOrdered size={16} strokeWidth={1.5} />
          <span className="text-[11px] font-medium uppercase tracking-[0.14em]">Times</span>
        </div>
        <span className="text-[11px] font-medium tabular-nums">{total} czasów</span>
      </div>

      {/* ── pasek sesji ── */}
      {editing ? (
        <div className="mt-5 flex items-center gap-2">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit()
              if (e.key === 'Escape') setEditing(false)
            }}
            className="min-w-0 flex-1 rounded-xl border border-ink-900/10 bg-white/60 px-3 py-2 text-sm text-ink-950 outline-none focus:border-ink-900/25"
            placeholder="Nazwa sesji"
          />
          <button
            type="button"
            onClick={saveEdit}
            aria-label="zapisz nazwę"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-950 text-white transition-opacity hover:opacity-90"
          >
            <Check size={15} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            aria-label="anuluj"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-900/10 text-ink-400 hover:text-ink-950"
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>
      ) : (
        <div className="mt-5 flex items-center gap-2">
          {/* chipy sesji — poziomy scroll na telefonie */}
          <div className="no-scrollbar -mx-1 flex flex-1 items-center gap-2 overflow-x-auto px-1 py-1">
            {sessions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveId(s.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors duration-150 ${
                  s.id === activeId
                    ? 'bg-ink-950 text-white'
                    : 'border border-ink-900/[0.08] bg-white/45 text-ink-500 hover:border-ink-900/15 hover:text-ink-950'
                }`}
              >
                {s.name}
              </button>
            ))}
            <button
              type="button"
              onClick={handleAdd}
              aria-label="dodaj sesję"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-ink-900/15 text-ink-400 transition-colors hover:border-ink-900/30 hover:text-ink-950"
            >
              <Plus size={15} strokeWidth={2} />
            </button>
          </div>

          {/* edycja / usuwanie aktywnej sesji (poza „Główną") */}
          {activeId !== 'default' && (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={startEdit}
                aria-label="zmień nazwę sesji"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-900/[0.05] hover:text-ink-950"
              >
                <Pencil size={14} strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                aria-label="usuń sesję"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 hover:bg-red-500/10 hover:text-red-500"
              >
                <Trash2 size={14} strokeWidth={1.75} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── tabela czasów ── */}
      {total === 0 ? (
        <div className="mt-6 flex h-24 items-center justify-center rounded-2xl bg-ink-900/[0.02] text-xs text-ink-400">
          Brak czasów w sesji „{activeName}". Zmierz pierwszy!
        </div>
      ) : (
        <div className="no-scrollbar mt-5 max-h-[360px] overflow-y-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-white/70 backdrop-blur-sm">
              <tr className="text-left text-[10px] font-medium uppercase tracking-[0.12em] text-ink-400">
                <th className="w-10 py-2 pl-1 font-medium">#</th>
                <th className="py-2 font-medium">Czas</th>
                <th className="hidden py-2 font-medium sm:table-cell">Godzina</th>
                <th className="py-2 pr-1 text-right font-medium">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const open = expandedId === r.id
                return (
                  <Fragment key={r.id ?? `${r.ts}-${i}`}>
                    <tr
                      onClick={() => toggleExpand(r.id)}
                      className="cursor-pointer border-t border-ink-900/[0.05] transition-colors hover:bg-ink-900/[0.02]"
                    >
                      <td className="py-2.5 pl-1 font-mono text-xs tabular-nums text-ink-400">{total - i}</td>
                      <td className="py-2.5 font-mono tabular-nums">
                        <span className="inline-flex items-center gap-1.5">
                          <ChevronDown
                            size={13}
                            strokeWidth={2}
                            className={`text-ink-300 transition-transform duration-200 ${open ? 'rotate-180' : '-rotate-90'}`}
                          />
                          <span
                            className={
                              r.status === 'DNF'
                                ? 'font-medium text-red-500'
                                : r.status === '+2'
                                  ? 'font-medium text-amber-600'
                                  : 'text-ink-950'
                            }
                          >
                            {formatResult(r.ms, r.status)}
                          </span>
                        </span>
                      </td>
                      <td className="hidden py-2.5 font-mono text-xs tabular-nums text-ink-400 sm:table-cell">
                        {clockOf(r.ts)}
                      </td>
                      <td className="py-1.5 pr-1">
                        <div className="flex items-center justify-end gap-1">
                          <RowAction
                            label="dodaj lub cofnij karę +2"
                            active={r.status === '+2'}
                            activeClass="bg-amber-500/15 text-amber-600"
                            onClick={() => toggle(r.id, r.status, '+2')}
                          >
                            +2
                          </RowAction>
                          <RowAction
                            label="oznacz lub cofnij DNF"
                            active={r.status === 'DNF'}
                            activeClass="bg-red-500/15 text-red-500"
                            onClick={() => toggle(r.id, r.status, 'DNF')}
                          >
                            DNF
                          </RowAction>
                          <RowAction label="usuń czas" onClick={() => remove(r.id)}>
                            <Trash2 size={14} strokeWidth={1.75} />
                          </RowAction>
                        </div>
                      </td>
                    </tr>

                    <AnimatePresence initial={false}>
                      {open && (
                        <tr>
                          <td colSpan={4} className="p-0">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: 'easeInOut' }}
                              className="overflow-hidden"
                            >
                              <div className="mb-2 rounded-xl bg-ink-900/[0.03] px-3.5 py-3">
                                <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-400">
                                  <Shuffle size={11} strokeWidth={1.6} /> Scramble
                                </div>
                                {r.scramble && r.scramble !== 'unrecorded' ? (
                                  <p className="mt-1.5 break-words font-mono text-xs leading-relaxed text-ink-700">
                                    {r.scramble}
                                  </p>
                                ) : (
                                  <p className="mt-1.5 text-xs italic text-ink-400">
                                    Brak zapisanego scramble (starszy wynik).
                                  </p>
                                )}
                                <p className="mt-2 text-[11px] text-ink-400">{dateOf(r.ts)}</p>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.section>
  )
}
