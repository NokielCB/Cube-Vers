import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Regex } from 'lucide-react'
import { MOVE_CATALOG } from '../lib/moves'
import NotationGrid from '../components/notation/NotationGrid'
import StudioCube from '../components/notation/StudioCube'

const COOLDOWN_MS = 1000

/**
 * SyntaxPage — sekcja „Cube Syntax", przemodelowana na Notation Studio:
 * asymetryczny podział lewa/prawa (siatka ruchów / jedna duża kostka 3D)
 * zamiast dawnego trenażera-flashcard. Pod spodem zostaje pełny, statyczny
 * słownik notacji (referencja, bez interakcji z główną kostką).
 *
 * Stan `queue` to jedyny most między kafelkami (DOM) a kostką (Three.js) —
 * patrz komentarz w StudioCube.jsx po pełne wyjaśnienie.
 *
 * ─────────────── ANTY-SPAM: isCooldown ŻYJE TU, W RODZICU ───────────────
 * Blokadę trzymamy jak najbliżej źródła kliknięć, a nie w dziecku (kostce):
 * `pushMove` odrzuca ruch, jeśli `isCooldown === true` — więc drugi klik nie
 * zdąży nawet dopisać się do kolejki, zanim animacja pierwszego się skończy.
 * `setTimeout` po 1 s zdejmuje blokadę; `useEffect` sprząta timer przy
 * odmontowaniu strony, żeby nie zostawić wiszącego callbacku (memory leak).
 */
export default function SyntaxPage() {
  const moveCount = MOVE_CATALOG.reduce((n, g) => n + g.moves.length, 0)
  const [queue, setQueue] = useState([])
  const [isCooldown, setIsCooldown] = useState(false)
  const idRef = useRef(0)
  const cooldownTimer = useRef(null)

  const pushMove = useCallback(
    (token) => {
      if (isCooldown) return // blokada: ruch w trakcie animacji — kliknięcie ignorujemy

      setIsCooldown(true)
      idRef.current += 1
      setQueue((q) => [...q, { id: idRef.current, token }])

      cooldownTimer.current = setTimeout(() => setIsCooldown(false), COOLDOWN_MS)
    },
    [isCooldown],
  )

  // Sprzątanie: jeśli strona odmontuje się w trakcie odliczania, nie zostawiamy
  // wiszącego setTimeout, który próbowałby ustawić stan na już nieistniejącym komponencie.
  useEffect(() => () => clearTimeout(cooldownTimer.current), [])

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-24 md:pt-10 lg:px-10">
      {/* ---------- nagłówek ---------- */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 22 }}
        className="flex items-center gap-2 text-ink-400"
      >
        <Regex size={16} strokeWidth={1.5} />
        <span className="text-[11px] font-medium uppercase tracking-[0.14em]">Cube Syntax</span>
      </motion.div>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink-950 sm:text-5xl">
        Notation Studio.
        <br />
        <span className="text-ink-400">Kliknij ruch, zobacz efekt.</span>
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-500">
        {moveCount} ruchów notacji WCA w jednym miejscu — każdy kafelek wysyła obrót do jednej,
        dużej kostki 3D po prawej.
      </p>

      {/* ---------- Notation Studio: asymetryczny podział siatka / kostka ---------- */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 22, delay: 0.05 }}
        className="mt-6 grid gap-4 sm:mt-8 lg:grid-cols-5"
      >
        <div className="min-w-0 lg:col-span-2">
          <NotationGrid onMove={pushMove} isCooldown={isCooldown} />
        </div>
        {/* mobile: kostka NAD siatką (order-first), niższa niż dawniej (~72vw,
            max 420px) — nie zajmuje całego ekranu, więc siatka „wystaje" pod
            spodem i łatwiej przewinąć stronę; desktop bez zmian.
            min-w-0 + overflow-hidden: element grida domyślnie ma min-width:auto
            i canvas rozpychał kolumnę poza ekran — teraz kostka jest przycięta
            do zaokrąglonego kafelka i nigdy nie wychodzi poza szerokość. */}
        <div className="tile order-first h-[min(72vw,420px)] min-w-0 overflow-hidden p-2 max-lg:touch-none sm:h-[480px] lg:order-none lg:col-span-3 lg:h-auto lg:min-h-[640px]">
          <StudioCube queue={queue} />
        </div>
      </motion.section>
    </div>
  )
}
