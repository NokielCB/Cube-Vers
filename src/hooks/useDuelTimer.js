import { useCallback, useEffect, useRef, useState } from 'react'
import { formatTime } from '../lib/formatTime'

/**
 * useDuelTimer — maszyna stanów stopera do LOKALNEGO POJEDYNKU na jednej
 * klawiaturze (Split-Time Local Duel). Dwie osoby dzielą JEDEN zegar; każde
 * uderzenie w spację "odcina" (split) kolejny finisz.
 *
 * ───────────────────────── MASZYNA STANÓW ─────────────────────────
 *
 *   IDLE ──hold spację──▶ HOLDING ──(≥holdMs)──▶ READY
 *     ▲                      │ (za wcześnie)         │ puść
 *     │                      └──────────────────────▶│
 *     │                                              ▼
 *     │                                        RUNNING_BOTH   ← wspólny zegar,
 *     │                                              │           obie połowy żyją
 *     │                                     1. split │
 *     │                                              ▼
 *     │                                       RUNNING_SECOND  ← Czas A zamrożony,
 *     │                                              │           połowa B biegnie
 *     │                                     2. split │
 *     │                                              ▼
 *     └────────────── reset() ◀───────────────  FINISHED      ← A i B złapane
 *
 * Sedno eleganckiego rozszerzenia start/stop na cztery stany:
 *   • Jest JEDEN znacznik startu (startRef) i JEDEN wspólny zegar — dzięki
 *     temu Czas A i Czas B są mierzone z tego samego zera i zawsze A ≤ B.
 *   • Zamiast bool `isRunning` trzymamy jawną FAZĘ. To ona (nie zegar)
 *     decyduje, co robi kolejne uderzenie w spację: pierwszy split robi
 *     BOTH→SECOND, drugi SECOND→FINISHED. Rozgałęzienie mamy w jednym
 *     miejscu (registerSplit), a nie porozrzucane po handlerach.
 *   • Fazę lustrzimy w refie (phaseRef) i ustawiamy SYNCHRONICZNIE, bo
 *     czytają ją zarówno pętla rAF, jak i nasłuchiwacz klawiatury —
 *     domknięty „stary" state Reacta by tu kłamał.
 *
 * ───────────────────────── ANTY-DUBEL (debounce) ─────────────────────────
 *
 * Ryzyko: jedno mocne uderzenie w spację odbija się (chatter) albo gracz
 * klepie 2× w mgnieniu — i jeden solve zalicza OBA czasy naraz. Bronimy się
 * PROGIEM CZASOWYM (guardMs), nie kolejnym stanem:
 *   • lastSplitRef trzyma moment ostatniego zaakceptowanego splitu; ustawiamy
 *     go już przy starcie, więc pierwszy split nie może paść tuż po starcie.
 *   • split szybszy niż guardMs od poprzedniego jest ODRZUCANY jako odbicie.
 *   • e.repeat ignoruje sprzętowe auto-powtórzenia przy przytrzymaniu,
 *   • split reaguje na keydown, a start na keyup — więc naturalnie wymaga
 *     osobnego, świeżego wciśnięcia (nie da się "przejechać" jednym trzymaniem).
 */

export const DUEL = {
  IDLE: 'idle',
  HOLDING: 'holding',
  READY: 'ready',
  RUNNING_BOTH: 'running_both',
  RUNNING_SECOND: 'running_second',
  FINISHED: 'finished',
}

const DEFAULT_HOLD_MS = 300 // ile trzymać spację, by uzbroić start
const DEFAULT_GUARD_MS = 250 // martwe okno chroniące przed podwójnym splitem

export function useDuelTimer({ holdMs = DEFAULT_HOLD_MS, guardMs = DEFAULT_GUARD_MS } = {}) {
  // Stan RZADKI (bezpieczny w Reactcie): faza i złapane czasy.
  const [phase, setPhase] = useState(DUEL.IDLE)
  const [times, setTimes] = useState({ a: null, b: null })

  // Dwa węzły z cyframi — piszemy do nich WPROST, bez re-renderu 60×/s
  // (ten sam „escape hatch" co w solowym TimerCard).
  const displayARef = useRef(null)
  const displayBRef = useRef(null)

  const startRef = useRef(0) // performance.now() wspólnego startu
  const rafRef = useRef(0) // id pętli requestAnimationFrame
  const holdTimeoutRef = useRef(0) // timeout progu READY
  const lastSplitRef = useRef(0) // moment ostatniego splitu (guard)

  // Lustro fazy dla nasłuchiwaczy/rAF — ustawiane SYNCHRONICZNIE.
  const phaseRef = useRef(phase)
  const setPhaseBoth = useCallback((p) => {
    phaseRef.current = p
    setPhase(p)
  }, [])

  const writeA = (ms) => {
    if (displayARef.current) displayARef.current.textContent = formatTime(ms)
  }
  const writeB = (ms) => {
    if (displayBRef.current) displayBRef.current.textContent = formatTime(ms)
  }

  // Pętla rAF — jedyne miejsce, gdzie „tyka" czas. Zero setState.
  const tick = useCallback(() => {
    const elapsed = performance.now() - startRef.current
    // Po pierwszym splicie połowa A jest zamrożona — nie nadpisujemy jej.
    if (phaseRef.current === DUEL.RUNNING_BOTH) writeA(elapsed)
    writeB(elapsed)
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const start = useCallback(() => {
    startRef.current = performance.now()
    lastSplitRef.current = startRef.current // uzbrój guard od chwili startu
    setTimes({ a: null, b: null })
    setPhaseBoth(DUEL.RUNNING_BOTH)
    rafRef.current = requestAnimationFrame(tick)
  }, [tick, setPhaseBoth])

  // Jedno uderzenie w spację podczas biegu = jeden split. Cała logika
  // „który to z kolei finisz" żyje tutaj, w jednym miejscu.
  const registerSplit = useCallback(() => {
    const now = performance.now()
    if (now - lastSplitRef.current < guardMs) return // odbicie/dubel → ignoruj
    lastSplitRef.current = now
    const elapsed = now - startRef.current

    if (phaseRef.current === DUEL.RUNNING_BOTH) {
      writeA(elapsed) // dociągnij dokładny Czas A
      setTimes((t) => ({ ...t, a: elapsed }))
      setPhaseBoth(DUEL.RUNNING_SECOND) // A zamrożony, B biegnie dalej
    } else if (phaseRef.current === DUEL.RUNNING_SECOND) {
      cancelAnimationFrame(rafRef.current)
      writeB(elapsed) // dociągnij dokładny Czas B
      setTimes((t) => ({ ...t, b: elapsed }))
      setPhaseBoth(DUEL.FINISHED)
    }
  }, [guardMs, setPhaseBoth])

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    clearTimeout(holdTimeoutRef.current)
    setTimes({ a: null, b: null })
    writeA(0)
    writeB(0)
    setPhaseBoth(DUEL.IDLE)
  }, [setPhaseBoth])

  // Anulowanie UZBROJENIA (nie startu). Używane przez ekran dotykowy: jeśli
  // palec przesunie się (użytkownik scrolluje), cofamy HOLDING/READY do IDLE,
  // żeby puszczenie palca NIE wystartowało zegara. W biegu (RUNNING_*) nie robi
  // nic — split w trakcie pomiaru zostaje nietknięty.
  const cancel = useCallback(() => {
    if (phaseRef.current === DUEL.HOLDING || phaseRef.current === DUEL.READY) {
      clearTimeout(holdTimeoutRef.current)
      setPhaseBoth(DUEL.IDLE)
    }
  }, [setPhaseBoth])

  // ── WSPÓLNA logika "wciśnięcia" — jedna dla spacji i dla dotyku ──
  // pressDown = keydown / touchstart, pressUp = keyup / touchend. Dzięki temu
  // ekran dotykowy (Arena na telefonie) przechodzi DOKŁADNIE tę samą maszynę
  // stanów co klawiatura, łącznie z guardem anty-dubel w registerSplit().
  const pressDown = useCallback(() => {
    const p = phaseRef.current
    if (p === DUEL.RUNNING_BOTH || p === DUEL.RUNNING_SECOND) {
      registerSplit()
      return
    }
    // Na ekranie wyniku wciśnięcie nic nie robi — nowy pojedynek startuje
    // świadomym reset() z UI, nie przypadkowym klepnięciem.
    if (p !== DUEL.IDLE) return

    writeA(0)
    writeB(0)
    setPhaseBoth(DUEL.HOLDING)
    holdTimeoutRef.current = setTimeout(() => setPhaseBoth(DUEL.READY), holdMs)
  }, [registerSplit, setPhaseBoth, holdMs])

  const pressUp = useCallback(() => {
    clearTimeout(holdTimeoutRef.current)
    if (phaseRef.current === DUEL.READY) start()
    else if (phaseRef.current === DUEL.HOLDING) setPhaseBoth(DUEL.IDLE)
  }, [start, setPhaseBoth])

  // Klawiatura: rejestrujemy RAZ (handlery stabilne przez useCallback),
  // sprzątamy komplet (listenery + timeout + rAF) w cleanupie.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code !== 'Space') return
      e.preventDefault()
      if (e.repeat) return // ignoruj sprzętowe auto-powtórzenia
      pressDown()
    }

    const onKeyUp = (e) => {
      if (e.code !== 'Space') return
      e.preventDefault()
      pressUp()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      clearTimeout(holdTimeoutRef.current)
      cancelAnimationFrame(rafRef.current)
    }
  }, [pressDown, pressUp])

  return { phase, times, displayARef, displayBRef, reset, cancel, pressDown, pressUp }
}
