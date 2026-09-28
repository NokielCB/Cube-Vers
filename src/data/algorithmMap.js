/**
 * Struktura "Algorithmic Constellation" — pozycje węzłów i relacje nauki.
 *
 * NODE_POSITIONS: id algorytmu → { x, y } na nieskończonym płótnie.
 *   Lewy klaster = OLL, prawy = PLL. Współrzędne dobrane ręcznie, żeby
 *   mapa oddychała (dużo przestrzeni), zgodnie z estetyką referencji.
 *
 * RELATIONS: [source, target] — logiczna kolejność nauki (od prostszych
 *   przypadków do trudniejszych / ich rozwinięć). To są krawędzie grafu.
 *
 * PLL to drzewo w kolumnach (co 240 px): każdy przypadek stoi o kolumnę
 * dalej niż ten, od którego się go uczy. Krawędź wychodzi z prawego boku
 * węzła i wchodzi w lewy bok następnego (Handle w AlgorithmNode), więc
 * biegnie tylko w szczelinie między kolumnami i nie przecina innych węzłów.
 * Wiersze co 140 px — węzeł ma ok. 100 px wysokości.
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
  // kolumna 0: wejście z OLL
  'pll-ua': { x: 860, y: 320 },
  // kolumna 1: druga połowa EPLL i T-perm, od którego rośnie reszta
  'pll-ub': { x: 1100, y: 40 },
  'pll-h': { x: 1100, y: 180 },
  'pll-t': { x: 1100, y: 740 },
  // kolumna 2
  'pll-z': { x: 1340, y: 180 },
  'pll-f': { x: 1340, y: 320 },
  'pll-jb': { x: 1340, y: 460 },
  'pll-aa': { x: 1340, y: 810 },
  'pll-ga': { x: 1340, y: 1020 },
  'pll-gc': { x: 1340, y: 1160 },
  // kolumna 3
  'pll-ja': { x: 1580, y: 320 },
  'pll-ra': { x: 1580, y: 460 },
  'pll-y': { x: 1580, y: 600 },
  'pll-ab': { x: 1580, y: 740 },
  'pll-e': { x: 1580, y: 880 },
  'pll-gb': { x: 1580, y: 1020 },
  'pll-gd': { x: 1580, y: 1160 },
  // kolumna 4: przypadki po przekątnej (od Y) i domknięcie R-perm
  'pll-rb': { x: 1820, y: 460 },
  'pll-v': { x: 1820, y: 600 },
  'pll-na': { x: 1820, y: 740 },
  'pll-nb': { x: 1820, y: 880 },
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
  // PLL — krawędzie (EPLL): U-permy, potem H i Z
  ['pll-ua', 'pll-ub'],
  ['pll-ua', 'pll-h'],
  ['pll-h', 'pll-z'],
  // T-perm otwiera zamiany sąsiednich narożników
  ['pll-ua', 'pll-t'],
  ['pll-t', 'pll-f'],
  ['pll-t', 'pll-jb'],
  ['pll-jb', 'pll-ja'],
  ['pll-jb', 'pll-ra'],
  ['pll-ra', 'pll-rb'],
  // same narożniki: A-permy i E
  ['pll-t', 'pll-aa'],
  ['pll-aa', 'pll-ab'],
  ['pll-aa', 'pll-e'],
  // G-permy parami
  ['pll-t', 'pll-ga'],
  ['pll-ga', 'pll-gb'],
  ['pll-t', 'pll-gc'],
  ['pll-gc', 'pll-gd'],
  // zamiana po przekątnej: Y, potem V i N-permy
  ['pll-jb', 'pll-y'],
  ['pll-y', 'pll-v'],
  ['pll-y', 'pll-na'],
  ['pll-y', 'pll-nb'],
]
