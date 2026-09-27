import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LineChart, ChevronDown } from 'lucide-react'
import { formatTime } from '../../lib/formatTime'
import {
  currentAverage,
  bestAverage,
  pbSingle,
  sessionMean,
  sessionStdev,
  solvedCount,
  recentTrend,
} from '../../lib/stats'

/** Formatowanie metryki: null → „—", 'DNF' → „DNF", liczba → czas. */
function fmt(v) {
  if (v == null) return '—'
  if (v === 'DNF') return 'DNF'
  return formatTime(v)
}

/**
 * StatsCard — surowy, minimalistyczny kafel analityki (styl referencji:
 * czysta tabela metryk + ultra-cienki wykres trendu z rozmytym gradientem).
 */

/**
 * Sparkline — czysty, animowany SVG. Bez zależności.
 *  - linia: grafit, 1.5px, `non-scaling-stroke` (zawsze cienka mimo skalowania),
 *  - pod nią: delikatny gradient + subtelny blur (jak na "Ongoing projects").
 *  - rysowanie linii animowane przez pathLength (framer-motion).
 */
function Sparkline({ data }) {
  const W = 100
  const H = 40
  // Pionowy margines: linia rysowana jest w środkowym paśmie wykresu, więc
  // nigdy nie „przykleja się" do górnej ani dolnej krawędzi kafla (wcześniej
  // najlepsze czasy lądowały tuż przy dole i linia wyglądała na urwaną).
  const TOP = H * 0.22
  const BOTTOM = H * 0.78

  if (data.length < 2) {
    return (
      <div className="flex h-24 items-center justify-center rounded-2xl bg-ink-900/[0.02] text-xs text-ink-400">
        Ułóż co najmniej 2 razy, aby zobaczyć trend
      </div>
    )
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const stepX = W / (data.length - 1)

  const pts = data.map((v, i) => {
    const x = i * stepX
    const y = TOP + (1 - (v - min) / range) * (BOTTOM - TOP) // niżej = lepszy czas
    return [x, y]
  })

  // Gładka, CIĄGŁA krzywa (Catmull-Rom → Bézier). Jedna nieprzerwana ścieżka,
  // bez segmentów „M" w środku, więc linia nigdy nie ma przerw.
  const line = pts.reduce((d, [x, y], i) => {
    if (i === 0) return `M${x.toFixed(2)} ${y.toFixed(2)}`
    const [x0, y0] = pts[i - 1]
    const [xp, yp] = pts[i - 2] || pts[i - 1]
    const [xn, yn] = pts[i + 1] || pts[i]
    const c1x = x0 + (x - xp) / 6
    const c1y = y0 + (y - yp) / 6
    const c2x = x - (xn - x0) / 6
    const c2y = y - (yn - y0) / 6
    return `${d} C${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)}`
  }, '')
  const area = `${line} L${W} ${H} L0 ${H} Z`
  const [lastX, lastY] = pts[pts.length - 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-24 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#171717" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#171717" stopOpacity="0" />
        </linearGradient>
        <filter id="spark-blur" x="-10%" y="-10%" width="120%" height="130%">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
      </defs>

      {/* rozmyty gradient pod linią */}
      <motion.path
        d={area}
        fill="url(#spark-fill)"
        filter="url(#spark-blur)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />

      {/* ultra-cienka linia trendu */}
      <motion.path
        d={line}
        fill="none"
        stroke="#171717"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: 'easeInOut' }}
      />

      {/* kropka na ostatnim (najnowszym) pomiarze */}
      <motion.circle
        cx={lastX}
        cy={lastY}
        r={1.8}
        fill="#171717"
        vectorEffect="non-scaling-stroke"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.2 }}
      />
    </svg>
  )
}

/** Pojedyncza metryka — etykieta u góry, duża wartość mono pod spodem. */
function Metric({ label, value, accent }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-400">
        {label}
      </span>
      <span
        className={`font-mono text-lg font-medium tabular-nums ${accent ? 'text-amber-700' : 'text-ink-950'}`}
      >
        {value}
      </span>
    </div>
  )
}

/** Nagłówek sekcji metryk. */
function Group({ title }) {
  return (
    <p className="col-span-2 -mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-300">
      {title}
    </p>
  )
}

/**
 * StatsCard — panel statystyk liczony z AKTYWNEJ SESJI, z uwzględnieniem kar
 * (+2 dolicza 2 s, DNF pomijany / psuje średnią wg reguł WCA).
 *
 * Rzeczy najważniejsze są zawsze widoczne; Ao50/Ao100, rekordowe średnie i
 * odchylenie chowamy pod „Statystyki zaawansowane", żeby kafel był zwarty
 * i tej samej wysokości co Timer. Wykres trendu jest przyklejony do dołu
 * (mt-auto), więc karta zawsze ładnie wypełnia wysokość.
 */
export default function StatsCard({ solves = [], sessionName }) {
  const [advanced, setAdvanced] = useState(false)

  const ao5 = currentAverage(solves, 5)
  const ao12 = currentAverage(solves, 12)
  const ao50 = currentAverage(solves, 50)
  const ao100 = currentAverage(solves, 100)
  const pb = pbSingle(solves)
  const bestAo5 = bestAverage(solves, 5)
  const bestAo12 = bestAverage(solves, 12)
  const mean = sessionMean(solves)
  const sd = sessionStdev(solves)
  const solved = solvedCount(solves)
  const trend = recentTrend(solves, 24)

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 22, delay: 0.05 }}
      className="tile flex h-full flex-col p-6 sm:p-8"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-ink-400">
          <LineChart size={16} strokeWidth={1.5} />
          <span className="text-[11px] font-medium uppercase tracking-[0.14em]">Statistics</span>
        </div>
        {sessionName && (
          <span className="max-w-[45%] truncate rounded-full bg-ink-900/[0.04] px-2.5 py-1 text-[11px] font-medium text-ink-500">
            {sessionName}
          </span>
        )}
      </div>

      {/* rdzeń — zawsze widoczny */}
      <div className="mt-7 grid grid-cols-2 gap-x-6 gap-y-6">
        <Group title="Bieżące" />
        <Metric label="Ao5" value={fmt(ao5)} />
        <Metric label="Ao12" value={fmt(ao12)} />

        <Group title="Rekordy" />
        <Metric label="Single (PB)" value={fmt(pb)} accent />
        <Metric label="Średnia sesji" value={fmt(mean)} />
      </div>

      {/* przełącznik statystyk zaawansowanych */}
      <button
        type="button"
        onClick={() => setAdvanced((a) => !a)}
        className="mt-6 flex items-center justify-between rounded-xl border border-ink-900/[0.06] bg-white/40 px-3.5 py-2.5 text-xs font-medium text-ink-500 transition-colors hover:border-ink-900/15 hover:text-ink-800"
      >
        Statystyki zaawansowane
        <ChevronDown
          size={15}
          strokeWidth={2}
          className={`transition-transform duration-200 ${advanced ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {advanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-6">
              <Group title="Średnie" />
              <Metric label="Ao50" value={fmt(ao50)} />
              <Metric label="Ao100" value={fmt(ao100)} />

              <Group title="Best & rozrzut" />
              <Metric label="Best Ao5" value={fmt(bestAo5)} />
              <Metric label="Best Ao12" value={fmt(bestAo12)} />
              <Metric label="Odch. std." value={fmt(sd)} />
              <Metric label="Ukończone" value={`${solved}/${solves.length}`} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* wykres trendu — przyklejony do dołu, żeby karta wypełniała wysokość */}
      <div className="mt-auto pt-8">
        <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-400">
          Recent trend
        </p>
        <Sparkline data={trend} />
      </div>
    </motion.section>
  )
}
