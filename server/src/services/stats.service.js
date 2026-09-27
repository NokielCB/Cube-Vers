/**
 * Warstwa domenowa — metryki speedcubingowe liczone PO STRONIE SERWERA.
 *
 * Odpowiednik frontendowego `src/lib/stats.js`, ale rozszerzony o poprawną
 * obsługę DNF zgodnie z regulaminem WCA. Ta sama konwencja wejścia:
 * lista solve'ów posortowana od NAJNOWSZEGO do najstarszego.
 *
 * Wszystkie funkcje są czyste (pure) i odporne na pusty stan.
 */

const DNF = Symbol('DNF')

/**
 * Zamienia solve na wartość używaną w liczeniu średnich WCA.
 * DNF traktujemy jako nieskończoność (zawsze "najgorszy" wynik),
 * dzięki czemu w Ao5/Ao12 zostaje odrzucony jako worst.
 */
function toValue(solve) {
  if (!solve || solve.status === 'DNF') return DNF
  return typeof solve.time === 'number' && !Number.isNaN(solve.time) ? solve.time : DNF
}

/**
 * Średnia WCA z dokładnie n ostatnich solve'ów.
 * Reguła: odrzuć najlepszy i najgorszy, uśrednij resztę.
 * DNF liczy się jako "worst": jeden DNF jest bezpiecznie odrzucany,
 * ale dwa lub więcej DNF => cała średnia jest DNF (zwracamy null).
 *
 * @returns {number|null} średnia w ms, albo null gdy za mało danych / DNF
 */
export function wcaAverageOf(solves, n) {
  if (!Array.isArray(solves) || solves.length < n) return null

  const window = solves.slice(0, n).map(toValue)
  const dnfCount = window.filter((v) => v === DNF).length

  // Przy średnich WCA z trimmingiem tolerujemy dokładnie jeden DNF.
  if (dnfCount > 1) return null

  // Sortujemy: liczby rosnąco, DNF zawsze na końcu (jako najgorszy).
  const sorted = [...window].sort((a, b) => {
    if (a === DNF) return 1
    if (b === DNF) return -1
    return a - b
  })

  const trimmed = sorted.slice(1, -1) // bez best i worst
  const sum = trimmed.reduce((acc, x) => acc + x, 0)
  return sum / trimmed.length
}

/** Personal Best — najniższy czysty czas w całej historii. null gdy brak. */
export function personalBest(solves) {
  const clean = (solves ?? [])
    .map(toValue)
    .filter((v) => v !== DNF)
  return clean.length ? Math.min(...clean) : null
}

/** Ostatnie n czasów w kolejności chronologicznej (stary → nowy) — pod wykres. */
export function recentTrend(solves, n = 16) {
  return (solves ?? [])
    .slice(0, n)
    .map((s) => (toValue(s) === DNF ? null : s.time))
    .reverse()
}

/**
 * Zbiorczy pakiet statystyk zwracany klientowi razem z historią.
 * Frontend nie musi już nic liczyć — tylko renderuje.
 */
export function buildStats(solves) {
  const list = Array.isArray(solves) ? solves : []
  return {
    count: list.length,
    pb: personalBest(list),
    ao5: wcaAverageOf(list, 5),
    ao12: wcaAverageOf(list, 12),
    trend: recentTrend(list, 16),
  }
}
