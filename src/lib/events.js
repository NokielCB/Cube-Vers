/**
 * Katalog konkurencji (events) obsługiwanych przez timer. Każdy wpis mówi, jak
 * wygenerować scramble i czy potrafimy narysować dla niego podgląd 2D (net).
 *
 *  - puzzle 'cube' + size N → generyczny scrambler NxN + podgląd (patrz cubeState),
 *  - pyraminx / skewb → własny scrambler, na razie bez podglądu wizualnego.
 */
export const EVENTS = [
  { id: '333', name: '3×3', short: '3×3', puzzle: 'cube', size: 3, len: 20, preview: true },
  { id: '222', name: '2×2', short: '2×2', puzzle: 'cube', size: 2, len: 11, preview: true },
  { id: '444', name: '4×4', short: '4×4', puzzle: 'cube', size: 4, len: 44, preview: true },
  { id: 'OH', name: '3×3 OH', short: 'OH', puzzle: 'cube', size: 3, len: 20, preview: true },
  { id: 'pyram', name: 'Pyraminx', short: 'Pyra', puzzle: 'pyraminx', len: 10, preview: false },
  { id: 'skewb', name: 'Skewb', short: 'Skewb', puzzle: 'skewb', len: 10, preview: false },
]

export const DEFAULT_EVENT = '333'

export function getEvent(id) {
  return EVENTS.find((e) => e.id === id) ?? EVENTS[0]
}
