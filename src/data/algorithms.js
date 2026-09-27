/**
 * Baza algorytmów OLL/PLL.
 *
 * pattern.top    — 9 × (1|0): żółte naklejki ściany U (wiersze od tyłu do przodu)
 * pattern.sides  — { n, e, s, w: [3 × (1|0)] }: żółte naklejki widoczne z boków
 * pattern.arrows — (PLL) [{ from: [row, col], to: [row, col], double }]
 *
 * Uwaga: diagramy przypadków są uproszczone pod potrzeby UI —
 * przed produkcją warto je zweryfikować 1:1 ze speedcubedb.
 */
export const ALGORITHMS = [
  // ---------------- OLL ----------------
  {
    id: 'oll-27',
    category: 'OLL',
    caseNumber: '#27',
    name: 'Sune',
    group: 'Cross',
    moves: "R U R' U R U2 R'",
    difficulty: 1,
    pattern: {
      top: [0, 1, 0, 1, 1, 1, 1, 1, 0],
      sides: { n: [1, 0, 0], e: [1, 0, 1], s: [0, 0, 0], w: [0, 0, 0] },
    },
  },
  {
    id: 'oll-26',
    category: 'OLL',
    caseNumber: '#26',
    name: 'Anti-Sune',
    group: 'Cross',
    moves: "R U2 R' U' R U' R'",
    difficulty: 1,
    pattern: {
      top: [0, 1, 0, 1, 1, 1, 0, 1, 1],
      sides: { n: [0, 0, 1], e: [0, 0, 0], s: [0, 0, 0], w: [1, 0, 1] },
    },
  },
  {
    id: 'oll-21',
    category: 'OLL',
    caseNumber: '#21',
    name: 'H (Double Sune)',
    group: 'Cross',
    moves: "R U R' U R U' R' U R U2 R'",
    difficulty: 2,
    pattern: {
      top: [0, 1, 0, 1, 1, 1, 0, 1, 0],
      sides: { n: [1, 0, 1], e: [0, 0, 0], s: [1, 0, 1], w: [0, 0, 0] },
    },
  },
  {
    id: 'oll-22',
    category: 'OLL',
    caseNumber: '#22',
    name: 'Pi',
    group: 'Cross',
    moves: "R U2 R2 U' R2 U' R2 U2 R",
    difficulty: 2,
    pattern: {
      top: [0, 1, 0, 1, 1, 1, 0, 1, 0],
      sides: { n: [1, 0, 0], e: [0, 0, 0], s: [1, 0, 0], w: [1, 0, 1] },
    },
  },
  {
    id: 'oll-33',
    category: 'OLL',
    caseNumber: '#33',
    name: 'T (Key)',
    group: 'T-Shapes',
    moves: "R U R' U' R' F R F'",
    difficulty: 2,
    pattern: {
      top: [1, 1, 0, 1, 1, 1, 1, 1, 0],
      sides: { n: [0, 0, 0], e: [1, 0, 1], s: [0, 0, 0], w: [0, 0, 0] },
    },
  },
  {
    id: 'oll-45',
    category: 'OLL',
    caseNumber: '#45',
    name: 'T (Suit Up)',
    group: 'T-Shapes',
    moves: "F R U R' U' F'",
    difficulty: 1,
    pattern: {
      top: [1, 1, 0, 1, 1, 1, 1, 1, 0],
      sides: { n: [0, 0, 1], e: [0, 0, 0], s: [0, 0, 1], w: [0, 0, 0] },
    },
  },
  {
    id: 'oll-57',
    category: 'OLL',
    caseNumber: '#57',
    name: 'H (Edges)',
    group: 'All Corners',
    moves: "R U R' U' M' U R U' r'",
    difficulty: 3,
    pattern: {
      top: [1, 1, 1, 0, 1, 0, 1, 1, 1],
      sides: { n: [0, 0, 0], e: [0, 1, 0], s: [0, 0, 0], w: [0, 1, 0] },
    },
  },
  // ---------------- PLL ----------------
  {
    id: 'pll-t',
    category: 'PLL',
    caseNumber: 'T',
    name: 'T-Perm',
    group: 'Adjacent Swap',
    moves: "R U R' U' R' F R2 U' R' U' R U R' F'",
    difficulty: 2,
    pattern: {
      top: [1, 1, 1, 1, 1, 1, 1, 1, 1],
      arrows: [
        { from: [0, 2], to: [2, 2], double: true },
        { from: [1, 0], to: [1, 2], double: true },
      ],
    },
  },
  {
    id: 'pll-ua',
    category: 'PLL',
    caseNumber: 'Ua',
    name: 'U-Perm (a)',
    group: 'Edges Only',
    moves: "M2 U M U2 M' U M2",
    difficulty: 1,
    pattern: {
      top: [1, 1, 1, 1, 1, 1, 1, 1, 1],
      arrows: [
        { from: [0, 1], to: [1, 0] },
        { from: [1, 0], to: [1, 2] },
        { from: [1, 2], to: [0, 1] },
      ],
    },
  },
  {
    id: 'pll-h',
    category: 'PLL',
    caseNumber: 'H',
    name: 'H-Perm',
    group: 'Edges Only',
    moves: "M2 U M2 U2 M2 U M2",
    difficulty: 1,
    pattern: {
      top: [1, 1, 1, 1, 1, 1, 1, 1, 1],
      arrows: [
        { from: [0, 1], to: [2, 1], double: true },
        { from: [1, 0], to: [1, 2], double: true },
      ],
    },
  },
  {
    id: 'pll-jb',
    category: 'PLL',
    caseNumber: 'Jb',
    name: 'J-Perm (b)',
    group: 'Adjacent Swap',
    moves: "R U R' F' R U R' U' R' F R2 U' R'",
    difficulty: 2,
    pattern: {
      top: [1, 1, 1, 1, 1, 1, 1, 1, 1],
      arrows: [
        { from: [0, 2], to: [2, 2], double: true },
        { from: [0, 1], to: [1, 2], double: true },
      ],
    },
  },
  {
    id: 'pll-y',
    category: 'PLL',
    caseNumber: 'Y',
    name: 'Y-Perm',
    group: 'Diagonal Swap',
    moves: "F R U' R' U' R U R' F' R U R' U' R' F R F'",
    difficulty: 3,
    pattern: {
      top: [1, 1, 1, 1, 1, 1, 1, 1, 1],
      arrows: [
        { from: [0, 0], to: [2, 2], double: true },
        { from: [0, 1], to: [1, 0], double: true },
      ],
    },
  },
]

export const CATEGORIES = ['ALL', 'OLL', 'PLL']

export const groupsFor = (category, algorithms = ALGORITHMS) => [
  ...new Set(
    algorithms
      .filter((a) => category === 'ALL' || a.category === category)
      .map((a) => a.group),
  ),
]
