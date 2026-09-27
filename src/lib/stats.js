/**
 * Metryki speedcubingowe liczone ze wspólnej listy solve'ów.
 *
 * Konwencja: `solves` to tablica { ms, ts } od NAJNOWSZEGO do najstarszego.
 * Wszystkie funkcje są czyste ORAZ odporne na pusty/niezainicjalizowany
 * stan — nigdy nie rzucają na `undefined`/`null`/[] (obrona przed "białym
 * ekranem" przy montowaniu komponentu z jeszcze niegotowymi danymi).
 */

// Wyciąga poprawne czasy (ms) z listy solve'ów, odsiewając śmieci.
function times(solves) {
  if (!Array.isArray(solves)) return []
  return solves.map((s) => s?.ms).filter((ms) => typeof ms === 'number' && !Number.isNaN(ms))
}

/**
 * Średnia WCA: odrzuca najlepszy i najgorszy wynik, uśrednia resztę.
 * Zwraca null, jeśli pomiarów jest mniej niż 3.
 */
export function wcaAverage(msList) {
  if (!Array.isArray(msList) || msList.length < 3) return null
  const sorted = [...msList].sort((a, b) => a - b)
  const trimmed = sorted.slice(1, -1) // bez best i worst
  return trimmed.reduce((sum, x) => sum + x, 0) / trimmed.length
}

/** Ao{n} z n najnowszych solve'ów. null, gdy jest ich mniej niż n. */
export function averageOf(solves, n) {
  const list = times(solves)
  if (list.length < n) return null
  return wcaAverage(list.slice(0, n))
}

/** Personal best — najniższy czas w historii. null, gdy brak danych. */
export function personalBest(solves) {
  const list = times(solves)
  return list.length ? Math.min(...list) : null
}

/**
 * Ostatnie n czasów w kolejności CHRONOLOGICZNEJ (stary → nowy) —
 * gotowe do narysowania trendu. Pomija DNF, +2 liczy z karą.
 */
export function recentTrend(solves, n = 16) {
  if (!Array.isArray(solves)) return []
  return solves
    .map(effTime)
    .filter((x) => Number.isFinite(x))
    .slice(0, n)
    .reverse()
}

/* ═══════════════════ STATYSTYKI z uwzględnieniem KAR ═══════════════════
 * Każdy solve może mieć status:
 *   'OK'  → liczy się jego czas,
 *   '+2'  → czas + 2000 ms (kara),
 *   'DNF' → nieukończony: do średnich traktowany jak „najgorszy",
 *           a jeśli DNF-ów jest za dużo, cała średnia = DNF.
 * Wartość zwracana ze średnich: liczba (ms) | 'DNF' | null (za mało danych).
 */

/** Efektywny czas jednego solve'a: DNF = Infinity, +2 = +2000, OK = czas. */
export function effTime(s) {
  if (!s || typeof s.ms !== 'number' || Number.isNaN(s.ms)) return Infinity
  if (s.status === 'DNF') return Infinity
  if (s.status === '+2') return s.ms + 2000
  return s.ms
}

// Ile odrzucamy z każdej strony (WCA: 1 dla ≤12, 5% w górę powyżej).
function trimCount(n) {
  return n <= 12 ? 1 : Math.ceil(n * 0.05)
}

function mean(list) {
  return list.reduce((s, x) => s + x, 0) / list.length
}

// Średnia WCA z listy czasów efektywnych (Infinity = DNF).
function wcaAvgEff(effs, n) {
  const t = trimCount(n)
  const dnf = effs.filter((x) => x === Infinity).length
  if (dnf > t) return 'DNF' // za dużo DNF-ów, nie da się przyciąć
  const sorted = [...effs].sort((a, b) => a - b)
  const middle = sorted.slice(t, n - t)
  return mean(middle)
}

/** Bieżąca średnia Ao{n} z n NAJNOWSZYCH solve'ów. */
export function currentAverage(solves, n) {
  if (!Array.isArray(solves) || solves.length < n) return null
  return wcaAvgEff(solves.slice(0, n).map(effTime), n)
}

/** Mo{n} — zwykła średnia n najnowszych (bez przycinania); DNF psuje całość. */
export function meanOfN(solves, n) {
  if (!Array.isArray(solves) || solves.length < n) return null
  const effs = solves.slice(0, n).map(effTime)
  if (effs.some((x) => x === Infinity)) return 'DNF'
  return mean(effs)
}

/** Najlepsza (najniższa) średnia Ao{n} w całej historii (rolling). */
export function bestAverage(solves, n) {
  if (!Array.isArray(solves) || solves.length < n) return null
  let best = null
  for (let i = 0; i + n <= solves.length; i++) {
    const avg = wcaAvgEff(solves.slice(i, i + n).map(effTime), n)
    if (typeof avg === 'number' && (best === null || avg < best)) best = avg
  }
  return best
}

/** Personal best (single) z uwzględnieniem +2, z pominięciem DNF. */
export function pbSingle(solves) {
  const eff = (Array.isArray(solves) ? solves : []).map(effTime).filter((x) => Number.isFinite(x))
  return eff.length ? Math.min(...eff) : null
}

/** Średnia sesji — wszystkie ukończone solve'y (DNF pominięte, +2 z karą). */
export function sessionMean(solves) {
  const eff = (Array.isArray(solves) ? solves : []).map(effTime).filter((x) => Number.isFinite(x))
  return eff.length ? mean(eff) : null
}

/** Odchylenie standardowe czasów sesji (populacyjne). null przy <2 pomiarach. */
export function sessionStdev(solves) {
  const eff = (Array.isArray(solves) ? solves : []).map(effTime).filter((x) => Number.isFinite(x))
  if (eff.length < 2) return null
  const m = mean(eff)
  return Math.sqrt(mean(eff.map((x) => (x - m) ** 2)))
}

/** Liczba ukończonych (bez DNF) — do „valid/total". */
export function solvedCount(solves) {
  return (Array.isArray(solves) ? solves : []).filter((x) => Number.isFinite(effTime(x))).length
}
