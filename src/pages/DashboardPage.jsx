import { useMemo } from 'react'
import { motion } from 'framer-motion'
import TimerCard from '../components/timer/TimerCard'
import StatsCard from '../components/stats/StatsCard'
import SolvesPanel from '../components/timer/SolvesPanel'
import MilestonesRow from '../components/dashboard/MilestonesRow'
import AnalyticsSection from '../components/stats/AnalyticsSection'
import { sessionKeyOf, useSessions } from '../context/SessionContext'

/**
 * DashboardPage — przestronna zakładka „Dashboard / Timer".
 * Bento: duży kafel Timera (2 kolumny) + smukły kafel Statystyk (1 kolumna),
 * pod spodem tabela czasów z przełączaniem sesji.
 * `solves`/`onSolve` przychodzą z App (podniesiony stan) — historia i metryki
 * są spójne i nie znikają przy przełączaniu zakładek.
 *
 * Statystyki, Timer (mini-historia) oraz tabela filtrują się po AKTYWNEJ sesji
 * i uwzględniają kary (+2/DNF) — status i sesja to pola solve'a (DataContext),
 * liczenie kar w lib/stats.
 */
export default function DashboardPage({ solves, onSolve }) {
  const { sessions, activeId } = useSessions()

  // Czasy aktywnej sesji — do Timera, statystyk i tabeli.
  const sessionSolves = useMemo(
    () => solves.filter((s) => sessionKeyOf(s) === activeId),
    [solves, activeId],
  )
  const sessionName = sessions.find((s) => s.id === activeId)?.name ?? 'Główna'

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-24 md:pt-10 lg:px-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 22 }}
        className="mb-6 flex items-baseline justify-between"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-ink-950">Dashboard</h1>
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-400">
          Session live
        </span>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TimerCard solves={sessionSolves} onSolve={onSolve} />
        </div>
        <div className="lg:col-span-1">
          <StatsCard solves={sessionSolves} sessionName={sessionName} />
        </div>
      </div>

      {/* tabela ostatnich czasów + wybór sesji (filtruje po aktywnej sesji) */}
      <SolvesPanel solves={solves} />

      {/* rząd osiągnięć — analizuje historię solve'ów */}
      <MilestonesRow solves={solves} />

      {/* silnik analityczny — dane liczone po stronie serwera (backend) */}
      <AnalyticsSection />
    </div>
  )
}
