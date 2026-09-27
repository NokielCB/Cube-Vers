/**
 * Polska odmiana rzeczownika po liczebniku: 1 czas, 2–4 czasy (ale 12–14
 * czasów), 5+ czasów. Liczy się końcówka liczby, stąd `% 10` i `% 100`.
 *
 * @example plural(3, 'czas', 'czasy', 'czasów') → '3 czasy'
 */
export function plural(n, one, few, many) {
  if (n === 1) return `1 ${one}`
  const last = n % 10
  const lastTwo = n % 100
  const isFew = last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)
  return `${n} ${isFew ? few : many}`
}
