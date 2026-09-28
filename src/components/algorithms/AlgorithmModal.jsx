import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Hand, Play, Sparkles, Timer, Trophy, X } from 'lucide-react'
import Cube3D from '../cube/Cube3D'
import Notation from './Notation'
import {
  activeAlternative,
  getAlternatives,
  getDetails,
  isAlternativeActive,
} from '../../data/algorithmDetails'
import { MAX_NOTE_LENGTH } from '../../data/algorithmProgressStore'
import { formatTime } from '../../lib/formatTime'

/**
 * AlgorithmModal — luksusowa, centralna karta szczegółów (Center Overlay).
 *
 * Tło aplikacji zostaje mocno rozmyte (backdrop-blur-2xl) z delikatnym
 * ~10% overlayem. Karta pojawia się skalowaniem od środka.
 *
 * AnimatePresence żyje w rodzicu (AlgorithmsPage) — tu renderujemy treść
 * tylko gdy `alg` istnieje, dzięki czemu animacja wyjścia zdąży się odegrać.
 *
 * Rekordy (`pbs`) są per WARIANT: klucz to sekwencja ruchów wariantu.
 * „Twój PB" w statystykach pokazuje rekord wariantu ustawionego jako główny.
 *
 * @param {{
 *   alg: object|null,
 *   onClose: ()=>void,
 *   onSetPrimary: (id:string, moves:string)=>void,
 *   notes: string,
 *   onNotesChange: (id:string, text:string)=>void,
 *   pbs: Record<string, number>,
 *   onTrain: (id:string, moves:string)=>void,
 * }} props
 */

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

function Stat({ Icon, label, value }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-ink-900/[0.06] bg-white/50 px-4 py-3">
      <div className="flex items-center gap-1.5 text-ink-400">
        <Icon size={13} strokeWidth={1.5} />
        <span className="text-[10px] font-medium uppercase tracking-[0.12em]">{label}</span>
      </div>
      <span className="font-mono text-base font-medium tabular-nums text-ink-950">{value}</span>
    </div>
  )
}

export default function AlgorithmModal({
  alg,
  onClose,
  onSetPrimary,
  notes = '',
  onNotesChange,
  pbs = {},
  onTrain,
}) {
  // Sygnał odtwarzania 3D — inkrementacja uruchamia sekwencję w Cube3D.
  const [playSignal, setPlaySignal] = useState(0)

  // Esc zamyka; blokujemy scroll tła. Listener sprzątany przy odmontowaniu.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  if (!alg) return null
  const details = getDetails(alg)
  const active = activeAlternative(alg) // wariant „główny" — jego PB i jego trenujemy

  return (
    // backdrop — rozmycie całej apki + 10% przyciemnienie; klik zamyka
    <motion.div
      // mobile: karta jako pełnoekranowy bottom sheet; sm+: wyśrodkowany modal
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-ink-950/10 backdrop-blur-2xl sm:items-center sm:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      {/* karta — luksusowe szkło, skalowanie od środka; klik nie propaguje */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Szczegóły ${alg.name}`}
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.97, opacity: 0, y: 32 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0, y: 32 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="relative mt-auto max-h-[94dvh] w-full max-w-5xl overflow-y-auto overscroll-contain rounded-bento rounded-b-none border border-white/40 bg-white/70 shadow-soft-lg backdrop-blur-2xl sm:my-auto sm:max-h-none sm:overflow-hidden sm:rounded-b-bento"
      >
        <button
          onClick={onClose}
          aria-label="Zamknij"
          className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-ink-900/[0.06] bg-white/60 text-ink-500 transition-colors duration-200 hover:text-ink-950"
        >
          <X size={16} strokeWidth={1.75} />
        </button>

        <div className="grid gap-6 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:gap-8 sm:p-8 sm:pb-8 lg:grid-cols-2 lg:gap-10 lg:p-12">
          {/* ——— LEWA: wizualizacja + nagłówek + statystyki ——— */}
          <div className="flex flex-col">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-400">
              {alg.category} · {alg.caseNumber} · {alg.group}
            </p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">{alg.name}</h2>

            {/* interaktywna kostka 3D (WebGL) zamiast płaskiego SVG */}
            <div className="relative mt-6 h-56 flex-1 overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-b from-white/50 to-white/15 sm:mt-8 sm:h-72">
              <Cube3D moves={alg.moves} playSignal={playSignal} />
              <span className="pointer-events-none absolute bottom-3 left-4 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-400">
                Przeciągnij, aby obrócić
              </span>
            </div>

            <div className="mt-8">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-400">
                  Główna sekwencja
                </p>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setPlaySignal((s) => s + 1)}
                  className="flex items-center gap-1.5 rounded-full bg-ink-950 px-3.5 py-1.5 text-[11px] font-medium text-alabaster-50 transition-opacity duration-200 hover:opacity-90"
                >
                  <Play size={11} strokeWidth={2} fill="currentColor" /> Odtwórz 3D
                </motion.button>
              </div>
              <Notation moves={alg.moves} />
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <Stat Icon={Sparkles} label="Trudność" value={<Difficulty n={alg.difficulty} />} />
              <Stat Icon={Hand} label="Popularność" value={`${details.popularity}%`} />
              <Stat Icon={Trophy} label="Twój PB" value={formatTime(pbs[active.moves])} />
            </div>
          </div>

          {/* ——— PRAWA: alternatywy + trening + notatki ——— */}
          <div className="flex flex-col gap-8">
            <section>
              <h3 className="text-sm font-semibold tracking-tight text-ink-950">
                Alternative Algorithms
              </h3>
              <p className="mt-1 text-xs text-ink-400">Inne sekwencje z tym samym efektem.</p>

              <div className="mt-4 flex flex-col gap-3">
                {getAlternatives(alg).map((alt) => {
                  // „Domyślny" + warianty; stan „Aktywny" liczy wspólny helper
                  // (ta sama sekwencja po odcięciu wiodącej rotacji).
                  const isActive = isAlternativeActive(alt, alg)
                  const altPb = pbs[alt.moves] // każdy wariant ma własny rekord
                  return (
                    <div
                      key={alt.moves}
                      className="rounded-2xl border border-ink-900/[0.06] bg-white/40 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-400">
                            {alt.label}
                          </span>
                          {altPb != null && (
                            <span
                              title="Twój rekord w tym wariancie"
                              className="flex items-center gap-1 rounded-full bg-ink-900/[0.04] px-2 py-0.5 font-mono text-[10px] tabular-nums text-ink-500"
                            >
                              <Trophy size={10} strokeWidth={1.75} />
                              {formatTime(altPb)}
                            </span>
                          )}
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          disabled={isActive}
                          onClick={() => onSetPrimary(alg.id, alt.moves)}
                          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors duration-200 ${
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

            {/* trening — przenosi do Timera w dedykowanej sesji tego wariantu */}
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-ink-950">
                <Timer size={15} strokeWidth={1.5} className="text-ink-400" />
                Trening
              </h3>
              <div className="mt-3 flex flex-col gap-4 rounded-2xl border border-ink-900/[0.06] bg-white/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm leading-relaxed text-ink-700">
                    Osobna sesja z timerem — zapisujemy tylko Twój najlepszy czas.
                  </p>
                  <p className="mt-1 truncate text-[11px] font-medium uppercase tracking-[0.12em] text-ink-400">
                    Wariant: {active.label}
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onTrain?.(alg.id, active.moves)}
                  className="flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-ink-950 px-4 py-2 text-xs font-medium text-alabaster-50 transition-opacity duration-200 hover:opacity-90"
                >
                  Trenuj algorytm <ArrowRight size={13} strokeWidth={2} />
                </motion.button>
              </div>
            </section>

            {/* notatki użytkownika — kontrolowane z rodzica, przeżywają zamknięcie */}
            <section className="flex flex-1 flex-col">
              <h3 className="text-sm font-semibold tracking-tight text-ink-950">Twoje notatki</h3>
              <textarea
                value={notes}
                onChange={(e) => onNotesChange(alg.id, e.target.value)}
                maxLength={MAX_NOTE_LENGTH}
                placeholder="Zapisz własne skojarzenia, palcówkę, triki rozpoznawania…"
                className="mt-3 min-h-[96px] flex-1 resize-none rounded-2xl border border-ink-900/[0.06] bg-white/40 p-4 text-sm leading-relaxed text-ink-800 placeholder:text-ink-400 focus:border-ink-900/20 focus:outline-none"
              />
            </section>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
