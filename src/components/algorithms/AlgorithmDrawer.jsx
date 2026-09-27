import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Hand, Sparkles, Trophy, X } from 'lucide-react'
import CubeDiagram from '../cube/CubeDiagram'
import { getAlternatives, getDetails, isAlternativeActive } from '../../data/algorithmDetails'
import { formatTime } from '../../lib/formatTime'

/**
 * AlgorithmDrawer — luksusowy panel boczny (slide-over) ze szczegółami
 * przypadku. Wysuwa się z prawej krawędzi, na mocnym szkle.
 *
 * WAŻNE: sam `AnimatePresence` żyje w rodzicu (AlgorithmsPage). Tutaj
 * renderujemy zawartość tylko wtedy, gdy `alg` istnieje — dzięki temu
 * zamknięcie odmontowuje komponent, a Framer zdąży odegrać animację wyjścia.
 *
 * @param {{ alg: object|null, onClose: ()=>void, onSetPrimary: (id:string, moves:string)=>void }} props
 */

/** Notacja — te same "klawisze" co na karcie, dla spójności. */
function Notation({ moves, tone = 'default' }) {
  const chip =
    tone === 'muted'
      ? 'border-ink-900/[0.06] bg-white/50 text-ink-500'
      : 'border-ink-900/[0.06] bg-ink-900/[0.03] text-ink-700'
  return (
    <div className="flex flex-wrap gap-1.5 font-mono text-[13px]">
      {moves.split(' ').map((m, i) => (
        <span key={`${m}-${i}`} className={`rounded-lg border px-1.5 py-0.5 ${chip}`}>
          {m}
        </span>
      ))}
    </div>
  )
}

function Stat({ Icon, label, value }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-ink-900/[0.06] bg-white/40 px-4 py-3">
      <div className="flex items-center gap-1.5 text-ink-400">
        <Icon size={13} strokeWidth={1.5} />
        <span className="text-[10px] font-medium uppercase tracking-[0.12em]">{label}</span>
      </div>
      <span className="font-mono text-base font-medium tabular-nums text-ink-950">{value}</span>
    </div>
  )
}

function Difficulty({ n }) {
  return (
    <div className="flex gap-1" title={`Difficulty ${n}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${i < n ? 'bg-ink-950' : 'bg-ink-900/15'}`}
        />
      ))}
    </div>
  )
}

export default function AlgorithmDrawer({ alg, onClose, onSetPrimary }) {
  // Zamknięcie na Esc — listener żyje tylko póki panel jest zamontowany,
  // a sprzątamy go w cleanupie (zero wycieków).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    // blokada scrolla tła — natywne wrażenie modalu
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  if (!alg) return null
  const details = getDetails(alg)

  return (
    <>
      {/* overlay — przyciemnienie + delikatny blur; klik zamyka */}
      <motion.div
        className="fixed inset-0 z-40 bg-ink-950/20 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
      />

      {/* panel — wysuwany z prawej, mocne szkło */}
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={`Szczegóły ${alg.name}`}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col overflow-y-auto rounded-l-bento border-l border-white/40 bg-white/60 shadow-soft-lg backdrop-blur-2xl"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
      >
        {/* przycisk zamknięcia */}
        <button
          onClick={onClose}
          aria-label="Zamknij panel"
          className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-ink-900/[0.06] bg-white/60 text-ink-500 transition-colors duration-200 hover:text-ink-950"
        >
          <X size={16} strokeWidth={1.75} />
        </button>

        <div className="flex flex-col gap-8 p-8 lg:p-10">
          {/* ——— nagłówek premium ——— */}
          <header>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-400">
              {alg.category} · {alg.caseNumber} · {alg.group}
            </p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight text-ink-950">{alg.name}</h2>

            <div className="mt-6 flex items-center justify-center rounded-3xl border border-white/40 bg-white/30 p-6">
              <CubeDiagram pattern={alg.pattern} className="h-40 w-40" />
            </div>

            <div className="mt-5">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-400">
                Główna sekwencja
              </p>
              <Notation moves={alg.moves} />
            </div>
          </header>

          {/* ——— statystyki ——— */}
          <div className="grid grid-cols-3 gap-3">
            <Stat
              Icon={Sparkles}
              label="Trudność"
              value={<Difficulty n={alg.difficulty} />}
            />
            <Stat Icon={Hand} label="Popularność" value={`${details.popularity}%`} />
            <Stat Icon={Trophy} label="Twój PB" value={formatTime(details.pb)} />
          </div>

          {/* ——— alternatywy ——— */}
          <section>
            <h3 className="text-sm font-semibold tracking-tight text-ink-950">
              Alternative Algorithms
            </h3>
            <p className="mt-1 text-xs text-ink-400">Inne sekwencje z tym samym efektem.</p>

            <div className="mt-4 flex flex-col gap-3">
              {getAlternatives(alg).map((alt) => {
                // Wspólny helper — spójnie z Modalem („Domyślny" + warianty,
                // aktywność po odcięciu wiodącej rotacji).
                const isActive = isAlternativeActive(alt, alg)
                return (
                  <div
                    key={alt.moves}
                    className="rounded-2xl border border-ink-900/[0.06] bg-white/40 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-400">
                        {alt.label}
                      </span>
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        disabled={isActive}
                        onClick={() => onSetPrimary(alg.id, alt.moves)}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors duration-200 ${
                          isActive
                            ? 'cursor-default border-transparent bg-ink-950 text-alabaster-50'
                            : 'border-ink-900/10 text-ink-500 hover:text-ink-950'
                        }`}
                      >
                        {isActive ? (
                          <>
                            <Check size={12} strokeWidth={2} /> Aktywny
                          </>
                        ) : (
                          'Ustaw jako główny'
                        )}
                      </motion.button>
                    </div>
                    <Notation moves={alt.moves} tone="muted" />
                  </div>
                )
              })}
            </div>
          </section>

          {/* ——— fingertrip tips ——— */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-ink-950">
              <Hand size={15} strokeWidth={1.5} className="text-ink-400" />
              Fingertrip Tips
            </h3>
            <div className="mt-3 rounded-2xl border border-ink-900/[0.06] bg-white/40 p-4">
              <p className="text-sm leading-relaxed text-ink-700">{details.tips}</p>
            </div>
            {/* miejsce na przyszłe mini-wideo / gif */}
            <div className="mt-3 flex h-16 items-center justify-center rounded-2xl border border-dashed border-ink-900/10 text-xs text-ink-400">
              Miejsce na mini-wideo / gif wykonania (wkrótce)
            </div>
          </section>
        </div>
      </motion.aside>
    </>
  )
}
