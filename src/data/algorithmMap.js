/**
 * Struktura "Algorithmic Constellation" — pozycje węzłów i relacje nauki.
 *
 * NODE_POSITIONS: id algorytmu → { x, y } na nieskończonym płótnie.
 *   Lewy klaster = OLL, prawy = PLL. Współrzędne dobrane ręcznie, żeby
 *   mapa oddychała (dużo przestrzeni), zgodnie z estetyką referencji.
 *
 * RELATIONS: [source, target] — logiczna kolejność nauki (od prostszych
 *   przypadków do trudniejszych / ich rozwinięć). To są krawędzie grafu.
 */

export const NODE_POSITIONS = {
  // ——— OLL ———
  'oll-45': { x: 40, y: 140 }, // najprostszy — punkt wejścia
  'oll-33': { x: 320, y: 40 },
  'oll-27': { x: 60, y: 360 }, // Sune
  'oll-26': { x: 340, y: 320 }, // Anti-Sune
  'oll-21': { x: 130, y: 580 }, // H (Double Sune)
  'oll-22': { x: 420, y: 560 }, // Pi
  'oll-57': { x: 590, y: 190 },
  // ——— PLL ———
  'pll-ua': { x: 860, y: 140 },
  'pll-h': { x: 1140, y: 70 },
  'pll-t': { x: 900, y: 380 },
  'pll-jb': { x: 1180, y: 360 },
  'pll-y': { x: 1040, y: 590 },
}

export const RELATIONS = [
  // OLL: od łatwego T, przez rodzinę Sune, po Pi
  ['oll-45', 'oll-33'],
  ['oll-45', 'oll-27'],
  ['oll-27', 'oll-26'],
  ['oll-26', 'oll-21'],
  ['oll-26', 'oll-22'],
  ['oll-33', 'oll-57'],
  ['oll-27', 'oll-57'],
  // most OLL → PLL
  ['oll-21', 'pll-ua'],
  // PLL: od U-perm/H (M-slice), przez T, po J i Y
  ['pll-ua', 'pll-h'],
  ['pll-ua', 'pll-t'],
  ['pll-t', 'pll-jb'],
  ['pll-jb', 'pll-y'],
  ['pll-t', 'pll-y'],
]
