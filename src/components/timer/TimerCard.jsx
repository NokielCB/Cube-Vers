import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Timer as TimerIcon, Shuffle, ChevronDown } from 'lucide-react'
import { generateScrambleFor } from '../../lib/scramble'
import { EVENTS, DEFAULT_EVENT, getEvent } from '../../lib/events'
import { formatTime, formatResult } from '../../lib/formatTime'
import { pbSingle } from '../../lib/stats'
import { haptics } from '../../lib/haptics'
import ScramblePreview from './ScramblePreview'

/**
 * TimerCard — profesjonalny stoper speedcubingowy jako duży kafel bento.
 *
 * ────────────────────────────────────────────────────────────────────
 *  STRATEGIA WYDAJNOŚCI (to jest sedno całego komponentu)
 * ────────────────────────────────────────────────────────────────────
 *  Milisekundy odświeżają się ~60×/s. Gdyby liczyć je przez useState,
 *  KAŻDA klatka wywoływałaby setState → render → rekoncyliację całego
 *  drzewa (Timer + potencjalnie rodzic i sąsiednie kafle Bento).
 *
 *  Zamiast tego trzymamy czas w useRef i piszemy go BEZPOŚREDNIO do DOM
 *  (displayRef.current.textContent) wewnątrz pętli requestAnimationFrame.
 *  React nie renderuje się ani razu podczas liczenia — zmienia się tylko
 *  jeden węzeł tekstowy. To klasyczny "escape hatch" z dokumentacji Reacta:
 *  dane, które zmieniają się szybciej niż użytkownik zdąży cokolwiek
 *  zauważyć, nie powinny żyć w stanie.
 *
 *  Stan Reacta trzymamy WYŁĄCZNIE dla rzeczy rzadkich i istotnych dla UI:
 *  faza (kolor/animacja), scramble oraz historia wyników.
 * ────────────────────────────────────────────────────────────────────
 */

// Ile ms trzeba przytrzymać spację, zanim timer uzna, że jesteśmy gotowi.
const HOLD_THRESHOLD_MS = 300

// Wybrana konkurencja pamięta się w localStorage.
const EVENT_KEY = 'cubeverse_event'
function loadEvent() {
  try {
    return localStorage.getItem(EVENT_KEY) || DEFAULT_EVENT
  } catch {
    return DEFAULT_EVENT
  }
}

// Kolor wielkich cyfr zależnie od fazy — funkcjonalny feedback dla oka.
const PHASE_COLOR = {
  idle: 'text-ink-950',
  holding: 'text-amber-500', // za krótko trzymane — jeszcze nie startuj
  ready: 'text-emerald-500', // gotowe — puść, by wystartować
  running: 'text-ink-950',
  stopped: 'text-ink-950',
}

/**
 * @param {{ solves: {ms:number, ts:number}[], onSolve: (ms:number)=>void }} props
 *   solves/onSolve są PODNIESIONE do App — dzięki temu historia ułożeń
 *   przeżywa odmontowanie kafla przy przełączaniu zakładek.
 */
export default function TimerCard({ solves = [], onSolve }) {
  // ——— stan RZADKI (bezpiecznie w Reactcie) ———
  const [phase, setPhase] = useState('idle') // idle | holding | ready | running | stopped
  const [eventId, setEventId] = useState(loadEvent)
  const [scramble, setScramble] = useState(() => generateScrambleFor(loadEvent()))
  const ev = getEvent(eventId)

  // ——— referencje: całe timing bez udziału renderowania ———
  const displayRef = useRef(null) // węzeł z cyframi, piszemy do niego wprost
  const startRef = useRef(0) // performance.now() startu
  const rafRef = useRef(0) // id requestAnimationFrame
  const holdTimeoutRef = useRef(0) // timeout progu "ready"

  // Lustra stanu dla nasłuchiwaczy klawiatury. Handlery rejestrujemy RAZ,
  // więc mają "stary" domknięty phase/scramble. Ref zawsze daje aktualną wartość.
  const phaseRef = useRef(phase)
  const scrambleRef = useRef(scramble)
  const eventRef = useRef(eventId)
  const onSolveRef = useRef(onSolve)
  const solvesRef = useRef(solves) // do wykrycia nowego PB (wibracja)
  useEffect(() => void (phaseRef.current = phase), [phase])
  useEffect(() => void (scrambleRef.current = scramble), [scramble])
  useEffect(() => void (eventRef.current = eventId), [eventId])
  useEffect(() => void (onSolveRef.current = onSolve), [onSolve])
  useEffect(() => void (solvesRef.current = solves), [solves])

  // Zmiana konkurencji: zapamiętaj wybór i wylosuj nowy scramble właściwy dla niej.
  const changeEvent = useCallback((id) => {
    setEventId(id)
    eventRef.current = id
    try {
      localStorage.setItem(EVENT_KEY, id)
    } catch {
      /* brak dostępu — pomijamy */
    }
    const next = generateScrambleFor(id)
    scrambleRef.current = next
    setScramble(next)
  }, [])

  const setPhaseBoth = useCallback((p) => {
    phaseRef.current = p
    setPhase(p)
  }, [])

  const writeDisplay = (ms) => {
    if (displayRef.current) displayRef.current.textContent = formatTime(ms)
  }

  // Pętla rAF — jedyne miejsce, gdzie "tyka" czas. Zero setState.
  const tick = useCallback(() => {
    writeDisplay(performance.now() - startRef.current)
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const start = useCallback(() => {
    startRef.current = performance.now()
    haptics.start() // krótka wibracja na telefonie
    setPhaseBoth('running')
    rafRef.current = requestAnimationFrame(tick)
  }, [tick, setPhaseBoth])

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    const elapsed = performance.now() - startRef.current
    writeDisplay(elapsed) // dociągnij dokładny wynik końcowy
    // Nowy PB? porównujemy PRZED dopisaniem wyniku (mocniejsza wibracja).
    const prevPb = pbSingle(solvesRef.current)
    onSolveRef.current?.(elapsed, scrambleRef.current) // zapis + scramble do historii
    if (prevPb == null || elapsed < prevPb) haptics.pb()
    else haptics.stop()
    setPhaseBoth('stopped')
    // nowy scramble właściwy dla bieżącej konkurencji
    const next = generateScrambleFor(eventRef.current)
    scrambleRef.current = next
    setScramble(next)
  }, [setPhaseBoth])

  // ——— Klawiatura: rejestrujemy RAZ, sprzątamy w cleanupie ———
  useEffect(() => {
    const onKeyDown = (e) => {
      // W trakcie liczenia zatrzymuje DOWOLNY klawisz.
      if (phaseRef.current === 'running') {
        e.preventDefault()
        stop()
        return
      }
      // Poza liczeniem interesuje nas tylko spacja.
      if (e.code !== 'Space') return
      e.preventDefault()
      if (e.repeat) return // ignoruj auto-powtórzenia przy przytrzymaniu

      // Zaczynamy przytrzymanie: reset na 0 i uzbrajanie progu "ready".
      writeDisplay(0)
      setPhaseBoth('holding')
      holdTimeoutRef.current = setTimeout(() => {
        setPhaseBoth('ready')
        haptics.ready() // delikatny „tik", że można puszczać
      }, HOLD_THRESHOLD_MS)
    }

    const onKeyUp = (e) => {
      if (e.code !== 'Space') return
      e.preventDefault()
      clearTimeout(holdTimeoutRef.current)

      if (phaseRef.current === 'ready') {
        start() // trzymane wystarczająco długo → mierz
      } else if (phaseRef.current === 'holding') {
        setPhaseBoth('idle') // puszczone za wcześnie → anuluj
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // KLUCZOWE dla braku memory leaków: zdejmujemy DOKŁADNIE te same
    // referencje funkcji, które dodaliśmy, oraz kasujemy timeout i rAF.
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      clearTimeout(holdTimeoutRef.current)
      cancelAnimationFrame(rafRef.current)
    }
  }, [start, stop, setPhaseBoth]) // stabilne (useCallback) → efekt biegnie raz

  // ——— DOTYK (mobile): cały kafel = jeden wielki przycisk ———
  // Dotknięcie i przytrzymanie DOWOLNEGO miejsca kafla działa jak spacja:
  // touchstart = keydown (uzbrajanie / stop), touchend = keyup (start / anuluj).
  // Zdarzenia touch nie odpalają się z myszy, więc desktop zostaje nietknięty.
  //
  // ─────────── SCROLL vs. START: palec musi być „w miejscu" ───────────
  // Problem: kafel jest duży, więc gest scrollowania strony zaczynał się często
  // na Timerze i mimowolnie go uzbrajał. Rozwiązanie: zapamiętujemy punkt
  // dotknięcia i jeśli palec przesunie się bardziej niż MOVE_TOLERANCE (px),
  // uznajemy to za SCROLL — kasujemy uzbrojenie i NIE startujemy timera przy
  // podniesieniu palca. Timer wystartuje tylko, gdy palec realnie stał w miejscu.
  const touchStartPos = useRef(null)
  const touchMoved = useRef(false)
  const MOVE_TOLERANCE = 12

  const onTouchStart = useCallback(
    (e) => {
      if (phaseRef.current === 'running') {
        stop()
        return
      }
      const t = e.touches?.[0]
      touchStartPos.current = t ? { x: t.clientX, y: t.clientY } : null
      touchMoved.current = false
      writeDisplay(0)
      setPhaseBoth('holding')
      holdTimeoutRef.current = setTimeout(() => {
        setPhaseBoth('ready')
        haptics.ready()
      }, HOLD_THRESHOLD_MS)
    },
    [stop, setPhaseBoth],
  )

  const onTouchMove = useCallback(
    (e) => {
      // W trakcie liczenia ruch palca nas nie obchodzi (stop robi dotknięcie).
      if (phaseRef.current === 'running' || touchMoved.current || !touchStartPos.current) return
      const t = e.touches?.[0]
      if (!t) return
      const dx = t.clientX - touchStartPos.current.x
      const dy = t.clientY - touchStartPos.current.y
      if (Math.hypot(dx, dy) > MOVE_TOLERANCE) {
        // Użytkownik scrolluje, nie mierzy → anuluj uzbrojenie.
        touchMoved.current = true
        clearTimeout(holdTimeoutRef.current)
        if (phaseRef.current === 'holding' || phaseRef.current === 'ready') setPhaseBoth('idle')
      }
    },
    [setPhaseBoth],
  )

  const onTouchEnd = useCallback(() => {
    clearTimeout(holdTimeoutRef.current)
    if (touchMoved.current) {
      // To był scroll — nic nie startujemy.
      touchMoved.current = false
      if (phaseRef.current !== 'running' && phaseRef.current !== 'stopped') setPhaseBoth('idle')
      return
    }
    if (phaseRef.current === 'ready') start()
    else if (phaseRef.current === 'holding') setPhaseBoth('idle')
  }, [start, setPhaseBoth])

  // Podpowiedź kontekstowa — inna dla klawiatury (md+) i dotyku (< md).
  const HINTS = {
    idle: ['Przytrzymaj spację, aby przygotować', 'Przytrzymaj ekran, aby przygotować'],
    holding: ['Trzymaj…', 'Trzymaj…'],
    ready: ['Puść, aby wystartować', 'Puść, aby wystartować'],
    running: ['Naciśnij dowolny klawisz, aby zatrzymać', 'Dotknij ekranu, aby zatrzymać'],
    stopped: ['Przytrzymaj spację, aby układać dalej', 'Przytrzymaj ekran, aby układać dalej'],
  }
  const [hintDesktop, hintTouch] = HINTS[phase]

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 22 }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      className="tile flex h-full touch-manipulation select-none flex-col items-center px-4 py-10 [-webkit-touch-callout:none] sm:px-8 sm:py-12 lg:py-16"
    >
      {/* nagłówek kafla */}
      <div className="flex w-full items-center justify-between text-ink-400">
        <div className="flex items-center gap-2">
          <TimerIcon size={16} strokeWidth={1.5} />
          <span className="text-[11px] font-medium uppercase tracking-[0.14em]">Timer</span>
        </div>
        {/* wybór konkurencji — zablokowany w trakcie liczenia */}
        <EventPicker
          eventId={eventId}
          onChange={changeEvent}
          disabled={phase === 'running' || phase === 'holding' || phase === 'ready'}
        />
      </div>

      {/* scramble — drobny, szary, mono */}
      <AnimatePresence mode="wait">
        <motion.p
          key={scramble}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-8 flex items-center gap-2 text-center font-mono text-sm tracking-wide text-ink-400"
        >
          <Shuffle size={13} strokeWidth={1.5} className="shrink-0" />
          {scramble}
        </motion.p>
      </AnimatePresence>

      {/* podgląd 2D (net) — tylko dla konkurencji sześciennych, chowa się w trakcie liczenia */}
      {ev.preview && phase !== 'running' && (
        <div className="mt-4 flex justify-center">
          <ScramblePreview scramble={scramble} size={ev.size} className="h-[78px] w-auto opacity-90" />
        </div>
      )}

      {/* WIELKI zegar — jedyny węzeł aktualizowany 60×/s, przez ref */}
      <motion.div
        animate={
          phase === 'holding'
            ? { scale: [1, 1.03, 1] }
            : phase === 'ready'
              ? { scale: 1.04 }
              : { scale: 1 }
        }
        transition={
          phase === 'holding'
            ? { duration: 0.7, repeat: Infinity, ease: 'easeInOut' }
            : { type: 'spring', stiffness: 300, damping: 20 }
        }
        className="my-8"
      >
        <span
          ref={displayRef}
          className={`select-none font-mono text-6xl font-medium tabular-nums leading-none tracking-tight transition-colors duration-200 sm:text-8xl lg:text-9xl ${PHASE_COLOR[phase]}`}
        >
          0.00
        </span>
      </motion.div>

      {/* podpowiedź kontekstowa */}
      <AnimatePresence mode="wait">
        <motion.p
          key={phase}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="h-4 text-xs font-medium text-ink-400"
        >
          <span className="hidden md:inline">{hintDesktop}</span>
          <span className="md:hidden">{hintTouch}</span>
        </motion.p>
      </AnimatePresence>

      {/* minihistoria — 3 ostatnie wyniki jako szare badge */}
      <div className="mt-8 flex min-h-[28px] items-center gap-2">
        <AnimatePresence initial={false}>
          {solves.slice(0, 3).map((r, i) => (
            <motion.span
              key={`${r.ts}-${i}`}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: i === 0 ? 1 : 0.55, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className={`rounded-full border border-ink-900/[0.06] bg-ink-900/[0.03] px-3 py-1 font-mono text-xs tabular-nums ${
                r.status === 'DNF' ? 'text-red-500' : r.status === '+2' ? 'text-amber-600' : 'text-ink-500'
              }`}
            >
              {formatResult(r.ms, r.status)}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </motion.section>
  )
}

/** EventPicker — kompaktowy wybór konkurencji (dropdown) w rogu nagłówka. */
function EventPicker({ eventId, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  const ev = getEvent(eventId)

  // Zamknięcie po kliknięciu poza menu.
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open])

  return (
    <div
      className="relative"
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-full border border-ink-900/[0.08] bg-white/50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-600 transition-colors hover:border-ink-900/20 disabled:opacity-40"
      >
        {ev.short}
        <ChevronDown size={12} strokeWidth={2} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-full z-20 mt-1.5 w-36 overflow-hidden rounded-2xl border border-white/50 bg-white/85 p-1 shadow-soft-lg backdrop-blur-2xl"
          >
            {EVENTS.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => {
                  onChange(e.id)
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium transition-colors ${
                  e.id === eventId ? 'bg-ink-950 text-white' : 'text-ink-600 hover:bg-ink-900/[0.05]'
                }`}
              >
                {e.name}
                {!e.preview && (
                  <span className={`text-[9px] ${e.id === eventId ? 'text-white/50' : 'text-ink-300'}`}>
                    bez podglądu
                  </span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
