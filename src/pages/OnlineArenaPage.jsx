import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Crown, Copy, Check, Play, Shuffle, Swords, Users } from 'lucide-react'
import { useDuelSocket } from '../hooks/useDuelSocket'
import { useSocial } from '../context/SocialContext'
import { formatTime } from '../lib/formatTime'
import OnlineDuelSide from '../components/arena/OnlineDuelSide'
import Lobby from '../components/arena/Lobby'

/**
 * OnlineArenaPage — sieciowy tryb pojedynku (gracz vs gracz przez WebSockets).
 *
 * Przepływ ekranów:
 *   Lobby → Poczekalnia (czekamy na 2. gracza) → Mecz (wspólny scramble,
 *   lokalny zegar + rywal na żywo) → Wynik (werdykt z serwera).
 *
 * Lokalny zegar to prosta maszyna: IDLE → HOLDING → SOLVING → FINISHED.
 * Każda zmiana fazy leci do serwera przez sendState(), a serwer natychmiast
 * przekazuje ją rywalowi (u niego widać nasz kafel). Symetrycznie: stan rywala
 * dostajemy z hooka (opponent.state) i rysujemy po prawej.
 */
const HOLD_MS = 300
// Ruch palca ponad tyle px = scroll (a nie „trzymanie w miejscu").
const MOVE_TOLERANCE = 12

export default function OnlineArenaPage() {
  const {
    connected, roomCode, playerCount, scramble, opponent, result, error,
    selfId, joinRoom, startMatch, sendState,
  } = useDuelSocket()

  // ── Wejście z wyzwania (Social Hub) ──
  // Gdy obaj gracze zaakceptowali, SocialContext wystawia pendingDuel z kodem
  // pokoju. Tu automatycznie dołączamy do tego pokoju; inicjator (autoStart)
  // po skompletowaniu składu odpala mecz — reszta to już zwykły przepływ Areny.
  const { pendingDuel, consumePendingDuel } = useSocial()
  const [challengeRoom, setChallengeRoom] = useState(null)
  const autoStartRef = useRef(false)
  const autoStartedRef = useRef(false)

  useEffect(() => {
    if (!pendingDuel) return
    autoStartRef.current = !!pendingDuel.autoStart
    setChallengeRoom(pendingDuel.roomCode)
    consumePendingDuel()
  }, [pendingDuel, consumePendingDuel])

  useEffect(() => {
    if (!challengeRoom || !connected) return
    joinRoom(challengeRoom)
  }, [challengeRoom, connected, joinRoom])

  // Inicjator: gdy obaj są w pokoju i nie ma jeszcze scramble — wystartuj mecz raz.
  useEffect(() => {
    if (autoStartRef.current && !autoStartedRef.current && playerCount === 2 && !scramble) {
      autoStartedRef.current = true
      startMatch()
    }
  }, [playerCount, scramble, startMatch])

  // ── lokalny zegar gracza ──
  const [phase, setPhase] = useState('IDLE')
  const phaseRef = useRef('IDLE')
  const displayRef = useRef(null)
  const startRef = useRef(0)
  const rafRef = useRef(0)
  const holdToRef = useRef(0)
  const finalTimeRef = useRef(null)
  const [copied, setCopied] = useState(false)
  // Dotyk: pozycja startu + flaga „palec się przesunął" (scroll).
  const touchStartPos = useRef(null)
  const touchMoved = useRef(false)

  const setPhaseBoth = useCallback((p) => {
    phaseRef.current = p
    setPhase(p)
  }, [])

  const write = (ms) => {
    if (displayRef.current) displayRef.current.textContent = formatTime(ms)
  }

  const tick = useCallback(() => {
    write(performance.now() - startRef.current)
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  // ── WSPÓLNA logika "wciśnięcia" — jedna dla spacji i dla dotyku ──
  // pressDown = keydown / touchstart, pressUp = keyup / touchend.
  const pressDown = useCallback(() => {
    if (phaseRef.current === 'SOLVING') {
      // finisz
      cancelAnimationFrame(rafRef.current)
      const t = performance.now() - startRef.current
      finalTimeRef.current = t
      write(t)
      setPhaseBoth('FINISHED')
      sendState('FINISHED', t)
      return
    }
    if (phaseRef.current === 'IDLE') {
      write(0)
      setPhaseBoth('HOLDING')
      sendState('HOLDING')
      holdToRef.current = setTimeout(() => {
        // uzbrojony — nic nie wysyłamy, czekamy na keyup/touchend
      }, HOLD_MS)
    }
  }, [setPhaseBoth, sendState])

  const pressUp = useCallback(() => {
    clearTimeout(holdToRef.current)
    if (phaseRef.current === 'HOLDING') {
      // start pomiaru
      startRef.current = performance.now()
      setPhaseBoth('SOLVING')
      sendState('SOLVING')
      rafRef.current = requestAnimationFrame(tick)
    }
  }, [tick, setPhaseBoth, sendState])

  // Anulowanie uzbrojenia (scroll palcem) — cofamy HOLDING do IDLE i mówimy
  // rywalowi, że jednak nie zaczynamy. W SOLVING nic nie ruszamy.
  const cancelArm = useCallback(() => {
    if (phaseRef.current !== 'HOLDING') return
    clearTimeout(holdToRef.current)
    setPhaseBoth('IDLE')
    sendState('IDLE')
    write(0)
  }, [setPhaseBoth, sendState])

  // Obsługa klawiatury aktywna tylko podczas trwającego meczu (jest scramble,
  // nie ma jeszcze wyniku). Sprzątamy listenery i rAF w cleanupie.
  const canPlay = !!scramble && !result
  useEffect(() => {
    if (!canPlay) return

    const onKeyDown = (e) => {
      if (e.code !== 'Space' || e.repeat) return
      e.preventDefault()
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
      clearTimeout(holdToRef.current)
      cancelAnimationFrame(rafRef.current)
    }
  }, [canPlay, pressDown, pressUp])

  // ─────────── DOTYK: start tylko przy palcu w miejscu ───────────
  // Uzbrajamy na touchstart, ale ruch palca ponad tolerancję (scroll) anuluje
  // uzbrojenie i nie startuje pomiaru. Finisz w trakcie SOLVING działa normalnie
  // (dotknięcie = finisz — obsługuje pressDown).
  const onArenaTouchStart = useCallback(
    (e) => {
      if (!canPlay) return
      const t = e.touches?.[0]
      touchStartPos.current = t ? { x: t.clientX, y: t.clientY } : null
      touchMoved.current = false
      pressDown()
    },
    [canPlay, pressDown],
  )

  const onArenaTouchMove = useCallback(
    (e) => {
      if (!canPlay || touchMoved.current || !touchStartPos.current) return
      const t = e.touches?.[0]
      if (!t) return
      const dx = t.clientX - touchStartPos.current.x
      const dy = t.clientY - touchStartPos.current.y
      if (Math.hypot(dx, dy) > MOVE_TOLERANCE) {
        touchMoved.current = true
        cancelArm() // anuluje tylko HOLDING; SOLVING zostaje nietknięty
      }
    },
    [canPlay, cancelArm],
  )

  const onArenaTouchEnd = useCallback(() => {
    if (!canPlay) return
    if (touchMoved.current) {
      touchMoved.current = false
      return // scroll — nie startujemy
    }
    pressUp()
  }, [canPlay, pressUp])

  // Nowy scramble (nowy mecz) → zeruj lokalny zegar.
  useEffect(() => {
    if (scramble) {
      finalTimeRef.current = null
      setPhaseBoth('IDLE')
      write(0)
    }
  }, [scramble, setPhaseBoth])

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch { /* schowek zablokowany */ }
  }

  // Werdykt: kto jest kim w wyniku z serwera.
  const verdict = useMemo(() => {
    if (!result) return null
    const me = result.results.find((r) => r.socketId === selfId)
    const rival = result.results.find((r) => r.socketId !== selfId)
    return { me, rival, iWon: result.winnerSocketId === selfId, draw: !result.winnerSocketId }
  }, [result, selfId])

  // ── EKRAN 1: Lobby ──
  if (!roomCode) return <Lobby connected={connected} onJoin={joinRoom} error={error} />

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-24 md:pt-10 lg:px-10">
      {/* nagłówek pokoju */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-ink-400">
          <Swords size={16} strokeWidth={1.5} />
          <span className="text-[11px] font-medium uppercase tracking-[0.14em]">Online Duel</span>
        </div>
        <button
          onClick={copyCode}
          className="flex items-center gap-2 rounded-full border border-ink-900/[0.06] bg-white/50 px-4 py-1.5 font-mono text-sm tracking-[0.2em] text-ink-700 transition-colors hover:border-ink-900/20"
        >
          {roomCode}
          {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-ink-400" />}
        </button>
      </div>

      {/* EKRAN 2: poczekalnia */}
      {playerCount < 2 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="tile mt-8 flex flex-col items-center justify-center gap-4 p-16 text-center"
        >
          <motion.span
            animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-900/[0.05] text-ink-400"
          >
            <Users size={24} strokeWidth={1.5} />
          </motion.span>
          <h2 className="text-xl font-semibold tracking-tight text-ink-950">Czekamy na rywala…</h2>
          <p className="max-w-sm text-sm text-ink-500">
            Przekaż drugiej osobie kod <span className="font-mono font-medium text-ink-900">{roomCode}</span>.
            Mecz odblokuje się, gdy oboje będziecie w pokoju.
          </p>
        </motion.div>
      )}

      {/* EKRAN 3a: obaj w pokoju, brak scramble → start */}
      {playerCount === 2 && !scramble && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="tile mt-8 flex flex-col items-center justify-center gap-5 p-16 text-center"
        >
          <span className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Obaj gotowi
          </span>
          <h2 className="text-2xl font-semibold tracking-tight text-ink-950">Gotowi do pojedynku?</h2>
          <button
            onClick={startMatch}
            className="flex items-center gap-2 rounded-full bg-ink-950 px-6 py-3 text-sm font-medium text-alabaster-50 transition-opacity hover:opacity-90"
          >
            <Play size={16} strokeWidth={2} /> Start meczu
          </button>
          <p className="text-xs text-ink-400">Serwer wylosuje wspólny scramble dla obu graczy.</p>
        </motion.div>
      )}

      {/* EKRAN 3b: mecz w toku */}
      {scramble && (
        <>
          <div className="mt-8 flex justify-center">
            <p className="flex items-center gap-2 text-center font-mono text-sm tracking-wide text-ink-400">
              <Shuffle size={13} strokeWidth={1.5} className="shrink-0" />
              {scramble}
            </p>
          </div>

          <div
            // Dotyk (mobile): arena = przycisk, ale start tylko przy palcu w
            // miejscu — scroll (ruch palca) anuluje uzbrojenie.
            onTouchStart={onArenaTouchStart}
            onTouchMove={onArenaTouchMove}
            onTouchEnd={onArenaTouchEnd}
            onTouchCancel={onArenaTouchEnd}
            className="relative mt-6 flex touch-manipulation select-none flex-col gap-4 [-webkit-touch-callout:none] lg:flex-row"
          >
            <OnlineDuelSide
              side="you"
              state={phase}
              displayRef={displayRef}
              winner={verdict?.iWon}
            />
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 lg:block">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/80 font-mono text-xs font-semibold tracking-wide text-ink-500 shadow-soft backdrop-blur-2xl">
                VS
              </span>
            </div>
            <OnlineDuelSide
              side="opponent"
              name={opponent.name}
              state={opponent.state}
              time={opponent.time}
              winner={verdict && !verdict.iWon && !verdict.draw}
            />
          </div>

          {phase !== 'FINISHED' && (
            <p className="mt-6 text-center text-xs font-medium text-ink-400">
              <span className="hidden md:inline">
                Przytrzymaj spację, puść by wystartować, wciśnij ponownie na finiszu
              </span>
              <span className="md:hidden">
                Przytrzymaj arenę, puść by wystartować, dotknij ponownie na finiszu
              </span>
            </p>
          )}
        </>
      )}

      {/* EKRAN 4: wynik meczu (werdykt z serwera) */}
      <AnimatePresence>
        {verdict && (
          <ResultOverlay verdict={verdict} onAgain={startMatch} />
        )}
      </AnimatePresence>
    </div>
  )
}

/** Nakładka z oficjalnym werdyktem serwera. */
function ResultOverlay({ verdict, onAgain }) {
  const { me, rival, iWon, draw } = verdict
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-30 flex items-center justify-center p-4 backdrop-blur-xl"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="w-full max-w-xl overflow-hidden rounded-bento border border-white/50 bg-white/80 p-8 shadow-soft-lg backdrop-blur-2xl lg:p-10"
      >
        <p className="text-center text-[11px] font-medium uppercase tracking-[0.14em] text-ink-400">
          Werdykt serwera
        </p>
        <h2 className="mt-1 text-center text-3xl font-semibold tracking-tight text-ink-950">
          {draw ? 'Remis' : iWon ? 'Wygrana! 🏆' : 'Porażka'}
        </h2>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <ResultCard label="Ty" res={me} won={iWon} />
          <ResultCard label={rival?.name || 'Rywal'} res={rival} won={!iWon && !draw} />
        </div>

        <button
          onClick={onAgain}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-ink-950 px-5 py-3 text-sm font-medium text-alabaster-50 transition-opacity hover:opacity-90"
        >
          <Play size={15} strokeWidth={2} /> Rewanż
        </button>
      </motion.div>
    </motion.div>
  )
}

function ResultCard({ label, res, won }) {
  const dnf = res?.status === 'DNF'
  return (
    <motion.div
      animate={{ scale: won ? 1 : 0.97, opacity: won ? 1 : 0.75 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className={`relative flex flex-col items-center gap-3 rounded-3xl border p-6 ${
        won ? 'border-amber-400/40 bg-amber-50/50' : 'border-ink-900/[0.06] bg-white/45'
      }`}
    >
      {won && (
        <span className="absolute -top-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-950 shadow-soft">
          <Crown size={11} strokeWidth={2.5} /> Winner
        </span>
      )}
      <span className="text-xs font-medium text-ink-500">{label}</span>
      <span className={`font-mono text-2xl font-semibold tabular-nums ${won ? 'text-amber-700' : 'text-ink-900'}`}>
        {dnf ? 'DNF' : formatTime(res?.time ?? 0)}
      </span>
    </motion.div>
  )
}
