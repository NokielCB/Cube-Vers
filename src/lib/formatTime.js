/**
 * ms → "SS.CC" lub "M:SS.CC" (centysekundy).
 * Współdzielone przez Timer i Statystyki, żeby format był spójny w całej apce.
 */
export function formatTime(ms) {
  if (ms == null || Number.isNaN(ms)) return '—'
  const totalCs = Math.floor(ms / 10)
  const cs = totalCs % 100
  const totalSec = Math.floor(totalCs / 100)
  const sec = totalSec % 60
  const min = Math.floor(totalSec / 60)
  const cc = String(cs).padStart(2, '0')
  if (min > 0) return `${min}:${String(sec).padStart(2, '0')}.${cc}`
  return `${sec}.${cc}`
}

/**
 * Wynik z uwzględnieniem kary/statusu — do tabeli czasów i mini-historii.
 *  - 'DNF' → napis „DNF" (czas nie liczy się do średnich),
 *  - '+2'  → czas + 2 s z doklejonym „+" (kara za lekko rozłożoną kostkę),
 *  - 'OK'  → zwykły czas.
 */
export function formatResult(ms, status = 'OK') {
  if (status === 'DNF') return 'DNF'
  if (status === '+2') return `${formatTime(ms + 2000)}+`
  return formatTime(ms)
}
