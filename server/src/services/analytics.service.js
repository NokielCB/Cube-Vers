/**
 * Analytics Engine — ciężkie obliczenia statystyczne robione BLISKO danych.
 *
 * Zasada przewodnia: liczymy w bazie (agregacje/filtry), a do Node'a ściągamy
 * tylko gotowe liczby, nie surowe tysiące rekordów. Każde zapytanie tutaj albo
 * jest agregacją DB-side (count/aggregate/groupBy), albo pobiera maleńki,
 * ograniczony wycinek (np. 40 czasów do trendu).
 */
import { prisma } from '../lib/prisma.js'

// Przedziały dystrybucji czasów (w ms). max=null → „i więcej".
const BUCKETS = [
  { key: 'sub15', label: 'Sub-15', min: 0, max: 15_000 },
  { key: 'sub20', label: 'Sub-20', min: 15_000, max: 20_000 },
  { key: 'sub25', label: 'Sub-25', min: 20_000, max: 25_000 },
  { key: 'sub30', label: 'Sub-30', min: 25_000, max: 30_000 },
  { key: 'plus30', label: '30+', min: 30_000, max: null },
]

const WEEKDAYS = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'] // JS getDay(): 0=Nd
const TIME_SLOTS = [
  { key: 'noc', label: 'Noc (00–06)', from: 0, to: 6 },
  { key: 'rano', label: 'Rano (06–12)', from: 6, to: 12 },
  { key: 'poludnie', label: 'Popołudnie (12–18)', from: 12, to: 18 },
  { key: 'wieczor', label: 'Wieczór (18–24)', from: 18, to: 24 },
]

const mean = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null)

export async function getAnalyticsSummary(userId) {
  // ── 1) DYSTRYBUCJA CZASÓW ─────────────────────────────────────────────
  // Każdy przedział to osobny COUNT liczony PRZEZ BAZĘ (z indeksu), nie pętla
  // w JS. Odpalamy je równolegle (Promise.all) — baza policzy je naraz.
  // DNF-y pomijamy (nie mają sensownego czasu do kubełkowania).
  const distribution = await Promise.all(
    BUCKETS.map((b) =>
      prisma.solve
        .count({
          where: {
            userId,
            status: { not: 'DNF' },
            time: { gte: b.min, ...(b.max != null ? { lt: b.max } : {}) },
          },
        })
        .then((count) => ({ key: b.key, label: b.label, count })),
    ),
  )

  // ── 2) AGREGATY OGÓLNE ────────────────────────────────────────────────
  // Jedno zapytanie zwraca licznik, średnią i minimum — wszystko po stronie DB.
  const agg = await prisma.solve.aggregate({
    where: { userId, status: { not: 'DNF' } },
    _count: { _all: true },
    _avg: { time: true },
    _min: { time: true },
  })

  // ── 3) ROZKŁAD STATUSÓW (groupBy) ─────────────────────────────────────
  // groupBy liczy OK/PLUS2/DNF jednym zapytaniem grupującym w bazie.
  const statusGroups = await prisma.solve.groupBy({
    by: ['status'],
    where: { userId },
    _count: { _all: true },
  })
  const statusBreakdown = Object.fromEntries(
    statusGroups.map((g) => [g.status, g._count._all]),
  )
  const totalSolves = statusGroups.reduce((s, g) => s + g._count._all, 0)
  const dnfCount = statusBreakdown.DNF ?? 0

  // ── 4) ANALIZA TRENDU (ostatnie 20 vs poprzednie 20) ──────────────────
  // Ściągamy TYLKO 40 liczb (jedna kolumna, indeksowane, limit 40) — to
  // znikomy transfer. Dwie średnie i % zmiany liczymy już na tej garstce.
  const recent = await prisma.solve.findMany({
    where: { userId, status: { not: 'DNF' } },
    orderBy: { createdAt: 'desc' },
    take: 40,
    select: { time: true },
  })
  const times = recent.map((r) => r.time)
  const currentAvg = mean(times.slice(0, 20))
  const previousAvg = mean(times.slice(20, 40))

  // Niższy czas = lepiej. Dodatni % = POSTĘP (przyspieszenie).
  let changePct = null
  if (currentAvg != null && previousAvg) {
    changePct = ((previousAvg - currentAvg) / previousAvg) * 100
  }
  // Linia trendu: ostatnie 20 chronologicznie (staro → nowo).
  const trendLine = times.slice(0, 20).reverse()

  // ── 5) WYKRYWANIE ANOMALII (DNF po dniach/porach) ─────────────────────
  // Ciężką część — filtr status='DNF' dla usera — wykonuje BAZA. Wraca tylko
  // mały podzbiór (same DNF-y, jedna kolumna daty), który kubełkujemy w JS.
  // Na PostgreSQL można to dopchnąć w całości do SQL: EXTRACT(DOW/HOUR ...).
  const dnfRows = await prisma.solve.findMany({
    where: { userId, status: 'DNF' },
    select: { createdAt: true },
  })

  const byWeekday = WEEKDAYS.map((label, day) => ({
    day,
    label,
    count: dnfRows.filter((r) => new Date(r.createdAt).getDay() === day).length,
  }))
  const byTimeOfDay = TIME_SLOTS.map((slot) => ({
    key: slot.key,
    label: slot.label,
    count: dnfRows.filter((r) => {
      const h = new Date(r.createdAt).getHours()
      return h >= slot.from && h < slot.to
    }).length,
  }))
  // „Najgorszy" moment — do wyróżnienia na froncie.
  const worstWeekday = byWeekday.reduce((a, b) => (b.count > a.count ? b : a), byWeekday[0])
  const worstSlot = byTimeOfDay.reduce((a, b) => (b.count > a.count ? b : a), byTimeOfDay[0])

  return {
    overview: {
      totalSolves,
      validSolves: agg._count._all,
      bestTime: agg._min.time,
      averageTime: agg._avg.time,
      dnfCount,
      dnfRate: totalSolves ? dnfCount / totalSolves : 0,
    },
    distribution,
    statusBreakdown,
    trend: {
      currentAvg,
      previousAvg,
      changePct, // dodatni = szybciej niż wcześniej
      improving: changePct != null ? changePct > 0 : null,
      line: trendLine,
      sampleSize: times.length,
    },
    anomalies: {
      byWeekday,
      byTimeOfDay,
      worstWeekday: dnfCount ? worstWeekday : null,
      worstSlot: dnfCount ? worstSlot : null,
    },
  }
}
