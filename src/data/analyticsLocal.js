/**
 * Lokalny odpowiednik backendowego analytics.service — liczy TEN SAM kształt
 * podsumowania, ale z solve'ów w localStorage (tryb Gościa). Dzięki temu
 * komponent wykresów dostaje identyczny obiekt niezależnie od źródła danych.
 *
 * Wejście: kanoniczne solve'y [{ time, status, createdAt }].
 */
const BUCKETS = [
  { key: 'sub15', label: 'Sub-15', min: 0, max: 15_000 },
  { key: 'sub20', label: 'Sub-20', min: 15_000, max: 20_000 },
  { key: 'sub25', label: 'Sub-25', min: 20_000, max: 25_000 },
  { key: 'sub30', label: 'Sub-30', min: 25_000, max: 30_000 },
  { key: 'plus30', label: '30+', min: 30_000, max: null },
]
const WEEKDAYS = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb']
const TIME_SLOTS = [
  { key: 'noc', label: 'Noc (00–06)', from: 0, to: 6 },
  { key: 'rano', label: 'Rano (06–12)', from: 6, to: 12 },
  { key: 'poludnie', label: 'Popołudnie (12–18)', from: 12, to: 18 },
  { key: 'wieczor', label: 'Wieczór (18–24)', from: 18, to: 24 },
]
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null)

export function computeAnalytics(solves = []) {
  const valid = solves.filter((s) => s.status !== 'DNF')
  const validTimes = valid.map((s) => s.time)

  const distribution = BUCKETS.map((b) => ({
    key: b.key,
    label: b.label,
    count: validTimes.filter((t) => t >= b.min && (b.max == null || t < b.max)).length,
  }))

  // rozkład statusów
  const statusBreakdown = solves.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1
    return acc
  }, {})
  const dnfCount = statusBreakdown.DNF ?? 0

  // trend: 20 najnowszych vs 20 poprzednich (solve'y od najnowszego)
  const recent = valid.map((s) => s.time)
  const currentAvg = mean(recent.slice(0, 20))
  const previousAvg = mean(recent.slice(20, 40))
  let changePct = null
  if (currentAvg != null && previousAvg) {
    changePct = ((previousAvg - currentAvg) / previousAvg) * 100
  }
  const line = recent.slice(0, 20).reverse()

  // anomalie DNF
  const dnf = solves.filter((s) => s.status === 'DNF')
  const byWeekday = WEEKDAYS.map((label, day) => ({
    day,
    label,
    count: dnf.filter((s) => new Date(s.createdAt).getDay() === day).length,
  }))
  const byTimeOfDay = TIME_SLOTS.map((slot) => ({
    key: slot.key,
    label: slot.label,
    count: dnf.filter((s) => {
      const h = new Date(s.createdAt).getHours()
      return h >= slot.from && h < slot.to
    }).length,
  }))
  const worstWeekday = byWeekday.reduce((a, b) => (b.count > a.count ? b : a), byWeekday[0])
  const worstSlot = byTimeOfDay.reduce((a, b) => (b.count > a.count ? b : a), byTimeOfDay[0])

  return {
    overview: {
      totalSolves: solves.length,
      validSolves: valid.length,
      bestTime: validTimes.length ? Math.min(...validTimes) : null,
      averageTime: mean(validTimes),
      dnfCount,
      dnfRate: solves.length ? dnfCount / solves.length : 0,
    },
    distribution,
    statusBreakdown,
    trend: {
      currentAvg,
      previousAvg,
      changePct,
      improving: changePct != null ? changePct > 0 : null,
      line,
      sampleSize: recent.length,
    },
    anomalies: {
      byWeekday,
      byTimeOfDay,
      worstWeekday: dnfCount ? worstWeekday : null,
      worstSlot: dnfCount ? worstSlot : null,
    },
  }
}
