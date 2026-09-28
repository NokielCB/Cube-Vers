/**
 * Struktura "Algorithmic Constellation" — pozycje węzłów i relacje nauki.
 *
 * NODE_POSITIONS: id algorytmu → { x, y } na nieskończonym płótnie.
 *   Lewy klaster = OLL, prawy = PLL.
 *
 * RELATIONS: [source, target] — logiczna kolejność nauki (od prostszych
 *   przypadków do trudniejszych / ich rozwinięć). To są krawędzie grafu.
 *
 * Siatka: kolumny co 240 px (węzeł ma 168 px szerokości), wiersze co 140 px
 * (węzeł ma ok. 100 px wysokości). Krawędź wychodzi z prawego boku węzła
 * i wchodzi w lewy bok następnego (Handle w AlgorithmNode), więc gdy łączy
 * sąsiednie kolumny, biegnie tylko w szczelinie i nie przecina węzłów.
 */
const COL = 240
const ROW = 140
const ORIGIN = 40

const x = (col) => ORIGIN + col * COL
const y = (row) => ORIGIN + row * ROW

/**
 * OLL — każdy wiersz to jeden lub kilka łańcuchów (grupy kształtów jak na
 * cube.academy), ustawionych jeden za drugim. W łańcuchu uczymy się od lewej.
 * Cross jest na górze, a OLL 21 na jego końcu — z niego idzie most do PLL,
 * przez puste pola po prawej stronie wierszy 0–2.
 */
const OLL_ROWS = [
  [['oll-27', 'oll-26', 'oll-22', 'oll-24', 'oll-25', 'oll-23', 'oll-21']], // Cross
  [['oll-45', 'oll-33'], ['oll-6', 'oll-5'], ['oll-28', 'oll-57']], // T · Block · Edges Only
  [['oll-7', 'oll-8', 'oll-11', 'oll-12', 'oll-40', 'oll-39']], // Lightning
  [['oll-44', 'oll-43', 'oll-31', 'oll-32'], ['oll-37', 'oll-35', 'oll-9', 'oll-10']], // P · Fish
  [['oll-48', 'oll-47', 'oll-54', 'oll-53', 'oll-49', 'oll-50'], ['oll-38', 'oll-36']], // Hook · W
  [['oll-51', 'oll-52', 'oll-56', 'oll-55'], ['oll-16', 'oll-15', 'oll-13', 'oll-14']], // Line · L
  [['oll-29', 'oll-30', 'oll-41', 'oll-42'], ['oll-46', 'oll-34']], // Awkward · C
  [['oll-1', 'oll-2', 'oll-17', 'oll-19', 'oll-18', 'oll-4', 'oll-20', 'oll-3']], // Dot
]

const ollPositions = {}
const ollRelations = []
OLL_ROWS.forEach((chains, row) => {
  let col = 0
  for (const chain of chains) {
    chain.forEach((id, i) => {
      ollPositions[id] = { x: x(col + i), y: y(row) }
      if (i > 0) ollRelations.push([chain[i - 1], id])
    })
    col += chain.length
  }
})

// PLL — drzewo w kolumnach: każdy przypadek stoi o kolumnę dalej niż ten,
// od którego się go uczy. Pierwsza kolumna PLL = 9. kolumna siatki (za OLL).
const P = 9
const pll = (col, top) => ({ x: x(P + col), y: top })

export const NODE_POSITIONS = {
  ...ollPositions,
  // kolumna 0: wejście z OLL
  'pll-ua': pll(0, 320),
  // kolumna 1: druga połowa EPLL i T-perm, od którego rośnie reszta
  'pll-ub': pll(1, 40),
  'pll-h': pll(1, 180),
  'pll-t': pll(1, 740),
  // kolumna 2
  'pll-z': pll(2, 180),
  'pll-f': pll(2, 320),
  'pll-jb': pll(2, 460),
  'pll-aa': pll(2, 810),
  'pll-ga': pll(2, 1020),
  'pll-gc': pll(2, 1160),
  // kolumna 3
  'pll-ja': pll(3, 320),
  'pll-ra': pll(3, 460),
  'pll-y': pll(3, 600),
  'pll-ab': pll(3, 740),
  'pll-e': pll(3, 880),
  'pll-gb': pll(3, 1020),
  'pll-gd': pll(3, 1160),
  // kolumna 4: przypadki po przekątnej (od Y) i domknięcie R-perm
  'pll-rb': pll(4, 460),
  'pll-v': pll(4, 600),
  'pll-na': pll(4, 740),
  'pll-nb': pll(4, 880),
}

export const RELATIONS = [
  // OLL: łańcuchy w wierszach (patrz OLL_ROWS)
  ...ollRelations,
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
