/**
 * Silnik osiągnięć — czyste funkcje liczone z historii solve'ów.
 *
 * WYDAJNOŚĆ: każde osiągnięcie to jeden lekki przebieg po tablicy
 * (lub użycie już policzonych metryk ze stats.js). Cała lista liczona
 * jest w useMemo po stronie widoku, więc przelicza się TYLKO gdy zmieni
 * się `solves` (nowy wynik), a nie przy każdym renderze. Dla dziesiątek
 * czy setek solve'ów to mikrosekundy.
 */
import { averageOf, personalBest } from './stats'

const clamp01 = (x) => Math.max(0, Math.min(1, x))
// Zawsze pracujemy na tablicy — nigdy nie czytamy .length z undefined.
const safe = (solves) => (Array.isArray(solves) ? solves : [])

/**
 * Definicje celów. Każdy `evaluate(solves)` zwraca:
 *   { progress: 0..1, done: boolean, detail: string }
 * `progress` jest monotoniczny — rośnie, im bliżej celu.
 */
export const ACHIEVEMENTS = [
  {
    id: 'sub-20',
    title: 'Breaking the Barrier',
    description: 'Zejdź poniżej 20 sekund choć raz.',
    evaluate(rawSolves) {
      const solves = safe(rawSolves)
      const best = personalBest(solves) // O(n), jeden przebieg
      if (best == null) return { progress: 0, done: false, detail: 'Brak ułożeń' }
      const done = best < 20000
      // im niższy best, tym bliżej 20s → wyższy progress
      const progress = done ? 1 : clamp01(20000 / best)
      return { progress, done, detail: `Best ${(best / 1000).toFixed(2)}s` }
    },
  },
  {
    id: 'ao5-sub-25',
    title: 'Consistency King',
    description: 'Osiągnij średnią Ao5 poniżej 25 sekund.',
    evaluate(rawSolves) {
      const solves = safe(rawSolves)
      if (solves.length < 5) {
        // faza zbierania danych — postęp = ile z 5 pomiarów mamy
        return {
          progress: clamp01(solves.length / 5),
          done: false,
          detail: `${solves.length}/5 solve'ów`,
        }
      }
      const ao5 = averageOf(solves, 5)
      const done = ao5 < 25000
      const progress = done ? 1 : clamp01(25000 / ao5)
      return { progress, done, detail: `Ao5 ${(ao5 / 1000).toFixed(2)}s` }
    },
  },
  {
    id: 'total-20',
    title: 'Dedicated Cuber',
    description: 'Wykonaj łącznie 20 ułożeń.',
    evaluate(rawSolves) {
      const n = safe(rawSolves).length
      return {
        progress: clamp01(n / 20),
        done: n >= 20,
        detail: `${n}/20`,
      }
    },
  },
]

/** Policz status wszystkich osiągnięć naraz. Odporne na brak danych. */
export function evaluateAchievements(solves) {
  const list = safe(solves)
  return ACHIEVEMENTS.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    ...a.evaluate(list),
  }))
}
