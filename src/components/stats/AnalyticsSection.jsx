import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatTime } from '../../lib/formatTime'
import ChartSkeleton from './ChartSkeleton'

const INK = '#171717'

/**
 * AnalyticsSection — „analityczne serce" Dashboardu. Pobiera gotowe statystyki
 * z /api/analytics/summary (React Query cache'uje wynik) i renderuje je w
 * szklanych bento-boxach: dystrybucja czasów, trend, analiza DNF.
 */
export default function AnalyticsSection() {
  const { isAuthenticated, isGuest } = useAuth()
  const { repo, mode } = useData() // repo = api LUB local, zależnie od trybu

  const { data, isLoading, isError } = useQuery({
    // mode w kluczu → chmura i gość mają osobny cache, nie mieszają się
    queryKey: ['analytics', mode],
    queryFn: () => repo.getAnalytics(),
    enabled: isAuthenticated || isGuest,
  })

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
  }

  return (
    <motion.section
      variants={container}
      initial="hidden"
      animate="show"
      className="mt-4 grid gap-4 lg:grid-cols-3"
    >
      {/* ── Dystrybucja czasów (2 kolumny) ── */}
      <Tile className="lg:col-span-2" title="Dystrybucja czasów" subtitle="Rozkład ułożeń w przedziałach">
        {isLoading ? (
          <ChartSkeleton bars height={200} />
        ) : isError ? (
          <ErrorNote />
        ) : (
          <DistributionChart data={data.distribution} />
        )}
      </Tile>

      {/* ── Trend (1 kolumna) ── */}
      <Tile title="Trend formy" subtitle="Ostatnie 20 vs poprzednie 20">
        {isLoading ? <ChartSkeleton height={200} /> : isError ? <ErrorNote /> : <TrendPanel trend={data.trend} />}
      </Tile>

      {/* ── Analiza DNF po dniach ── */}
      <Tile className="lg:col-span-2" title="Anomalie — DNF wg dnia" subtitle="Kiedy najczęściej się nie udaje">
        {isLoading ? (
          <ChartSkeleton bars height={160} />
        ) : isError ? (
          <ErrorNote />
        ) : (
          <DnfWeekdayChart anomalies={data.anomalies} />
        )}
      </Tile>

      {/* ── Kafel „najgorszy moment" ── */}
      <Tile title="Twoja pięta achillesowa" subtitle="Najwięcej DNF">
        {isLoading ? <ChartSkeleton height={160} /> : isError ? <ErrorNote /> : <WorstMoment anomalies={data.anomalies} />}
      </Tile>
    </motion.section>
  )
}

/* ─────────────────────────── kafel bento ─────────────────────────── */
function Tile({ title, subtitle, className = '', children }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
      transition={{ type: 'spring', stiffness: 140, damping: 20 }}
      className={`tile p-6 ${className}`}
    >
      <div className="mb-5">
        <h3 className="text-sm font-semibold tracking-tight text-ink-950">{title}</h3>
        <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-400">
          {subtitle}
        </p>
      </div>
      {children}
    </motion.div>
  )
}

function ErrorNote() {
  return (
    <div className="flex h-40 items-center justify-center text-xs text-ink-400">
      Nie udało się wczytać analityki.
    </div>
  )
}

/* ─────────────────────── wykres dystrybucji ─────────────────────── */
function DistributionChart({ data }) {
  const empty = data.every((d) => d.count === 0)
  if (empty) return <EmptyNote>Dodaj kilka ułożeń, aby zobaczyć rozkład.</EmptyNote>

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
        <CartesianGrid vertical={false} stroke={INK} strokeOpacity={0.06} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#a3a3a3' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#a3a3a3' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: INK, fillOpacity: 0.04 }}
          contentStyle={tooltipStyle}
          labelStyle={{ color: INK, fontWeight: 600, fontSize: 12 }}
          formatter={(v) => [`${v} ułożeń`, '']}
        />
        <Bar dataKey="count" fill={INK} fillOpacity={0.85} radius={[6, 6, 0, 0]} maxBarSize={44} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ─────────────────────────── panel trendu ─────────────────────────── */
function TrendPanel({ trend }) {
  const { changePct, improving, line, currentAvg } = trend
  const hasChange = changePct != null
  const chartData = line.map((t, i) => ({ i, t }))

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-3xl font-semibold tabular-nums text-ink-950">
          {currentAvg != null ? formatTime(currentAvg) : '—'}
        </span>
        {hasChange && (
          <span
            className={`flex items-center gap-1 text-sm font-medium ${
              improving ? 'text-emerald-600' : 'text-rose-500'
            }`}
          >
            {improving ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
            {Math.abs(changePct).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="mt-1 text-[11px] text-ink-400">
        {hasChange
          ? improving
            ? 'Szybciej niż w poprzednim oknie'
            : 'Wolniej niż w poprzednim oknie'
          : 'Za mało danych do porównania'}
      </p>

      {chartData.length >= 2 ? (
        <ResponsiveContainer width="100%" height={120} className="mt-4">
          <LineChart data={chartData} margin={{ top: 8, right: 6, bottom: 0, left: 6 }}>
            <Line
              type="monotone"
              dataKey="t"
              stroke={INK}
              strokeWidth={1}
              dot={false}
              isAnimationActive
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v) => [formatTime(v), 'czas']}
              labelFormatter={() => ''}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="mt-4 flex h-[120px] items-center justify-center rounded-2xl bg-ink-900/[0.02] text-xs text-ink-400">
          Potrzeba więcej ułożeń
        </div>
      )}
    </div>
  )
}

/* ───────────────────────── DNF wg dnia ───────────────────────── */
function DnfWeekdayChart({ anomalies }) {
  const total = anomalies.byWeekday.reduce((s, d) => s + d.count, 0)
  if (!total) return <EmptyNote>Brak DNF-ów — czysta gra. 👏</EmptyNote>

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={anomalies.byWeekday} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
        <CartesianGrid vertical={false} stroke={INK} strokeOpacity={0.06} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#a3a3a3' }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#a3a3a3' }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: INK, fillOpacity: 0.04 }}
          contentStyle={tooltipStyle}
          formatter={(v) => [`${v} DNF`, '']}
        />
        <Bar dataKey="count" fill={INK} fillOpacity={0.6} radius={[6, 6, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ─────────────────── kafel „najgorszy moment" ─────────────────── */
function WorstMoment({ anomalies }) {
  const { worstWeekday, worstSlot } = anomalies
  if (!worstWeekday || !worstWeekday.count) {
    return <EmptyNote>Brak nieudanych podejść. Świetnie!</EmptyNote>
  }
  return (
    <div className="flex h-full flex-col justify-center gap-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
          <AlertTriangle size={18} strokeWidth={1.8} />
        </span>
        <div>
          <p className="text-lg font-semibold text-ink-950">{worstWeekday.label}</p>
          <p className="text-[11px] text-ink-400">{worstWeekday.count} nieudanych podejść</p>
        </div>
      </div>
      {worstSlot?.count > 0 && (
        <div className="rounded-2xl bg-ink-900/[0.03] px-4 py-3 text-xs text-ink-500">
          Najwięcej wpadek: <span className="font-medium text-ink-800">{worstSlot.label}</span>
        </div>
      )}
    </div>
  )
}

function EmptyNote({ children }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-2xl bg-ink-900/[0.02] px-6 text-center text-xs text-ink-400">
      {children}
    </div>
  )
}

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid rgba(23,23,23,0.08)',
  background: 'rgba(255,255,255,0.9)',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
  fontSize: 12,
}
