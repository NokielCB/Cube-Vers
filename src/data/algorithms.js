/**
 * Baza algorytmów OLL/PLL.
 *
 * pattern.top    — 9 × (1|0): żółte naklejki ściany U (wiersze od tyłu do przodu)
 * pattern.sides  — { n, e, s, w: [3 × (1|0)] }: żółte naklejki widoczne z boków
 * pattern.arrows — (PLL) [{ from: [row, col], to: [row, col], double }]
 *
 * Strzałka PLL mówi, DOKĄD trafi element z pola `from` po wykonaniu `moves`
 * (`double` = zamiana miejscami). Strzałki są wyliczone symulatorem kostki
 * z setupu (odwrotności `moves`), więc pasują dokładnie do tej sekwencji.
 * Gdy algorytm kończy się bez AUF (np. Jb), diagram pokazuje przypadek
 * z takim obrotem warstwy U, przy którym strzałek jest najmniej — tak jak
 * na standardowych schematach PLL.
 *
 * `moves` nie zaczyna się od rotacji y (to tylko „z której strony zacząć");
 * wiodące x/z zostają, bo są częścią algorytmu (np. A-perm).
 *
 * Uwaga: diagramy OLL (top/sides) są jeszcze uproszczone i nie zgadzają się
 * z symulatorem — do weryfikacji 1:1 ze speedcubedb.
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
  // Kolejność i grupy jak na speedcubedb.com/a/3x3/PLL. Strzałki wyliczone
  // symulatorem z setupu (odwrotności `moves`) — patrz komentarz na górze.
  {
    id: 'pll-aa',
    category: 'PLL',
    caseNumber: 'Aa',
    name: 'A-Perm (a)',
    group: 'Adjacent Swap',
    moves: "x R' U R' D2 R U' R' D2 R2 x'",
    difficulty: 2,
    pattern: {
      top: [1, 1, 1, 1, 1, 1, 1, 1, 1],
      arrows: [
        { from: [0, 0], to: [0, 2] },
        { from: [0, 2], to: [2, 2] },
        { from: [2, 2], to: [0, 0] },
      ],
    },
  },
  {
    id: 'pll-ab',
    category: 'PLL',
    caseNumber: 'Ab',
    name: 'A-Perm (b)',
    group: 'Adjacent Swap',
    moves: "x R2 D2 R U R' D2 R U' R x'",
    difficulty: 2,
    pattern: {
      top: [1, 1, 1, 1, 1, 1, 1, 1, 1],
      arrows: [
        { from: [0, 0], to: [2, 2] },
        { from: [0, 2], to: [0, 0] },
        { from: [2, 2], to: [0, 2] },
      ],
    },
  },
  {
    id: 'pll-e',
    category: 'PLL',
    caseNumber: 'E',
    name: 'E-Perm',
    group: 'Diagonal Swap',
    moves: "x' R U' R' D R U R' D' R U R' D R U' R' D' x",
    difficulty: 3,
    pattern: {
      top: [1, 1, 1, 1, 1, 1, 1, 1, 1],
      arrows: [
        { from: [0, 0], to: [2, 0], double: true },
        { from: [0, 2], to: [2, 2], double: true },
      ],
    },
  },
  {
    id: 'pll-f',
    category: 'PLL',
    caseNumber: 'F',
    name: 'F-Perm',
    group: 'Adjacent Swap',
    moves: "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R",
    difficulty: 3,
    pattern: {
      top: [1, 1, 1, 1, 1, 1, 1, 1, 1],
      arrows: [
        { from: [0, 1], to: [2, 1], double: true },
        { from: [0, 2], to: [2, 2], double: true },
      ],
    },
  },
  {
    id: 'pll-ga',
    category: 'PLL',
    caseNumber: 'Ga',
    name: 'G-Perm (a)',
    group: 'Adjacent Swap',
    moves: "R2 U R' U R' U' R U' R2 D U' R' U R D'",
    difficulty: 3,
    pattern: {
      top: [1, 1, 1, 1, 1, 1, 1, 1, 1],
      arrows: [
        { from: [0, 1], to: [2, 1] },
        { from: [0, 2], to: [2, 2], double: true },
        { from: [1, 0], to: [0, 1] },
        { from: [1, 2], to: [1, 0] },
        { from: [2, 1], to: [1, 2] },
      ],
    },
  },
  {
    id: 'pll-gb',
    category: 'PLL',
    caseNumber: 'Gb',
    name: 'G-Perm (b)',
    group: 'Adjacent Swap',
    moves: "R' U' R U D' R2 U R' U R U' R U' R2 D",
    difficulty: 3,
    pattern: {
      top: [1, 1, 1, 1, 1, 1, 1, 1, 1],
      arrows: [
        { from: [0, 1], to: [1, 0] },
        { from: [0, 2], to: [2, 2], double: true },
        { from: [1, 0], to: [1, 2] },
        { from: [1, 2], to: [2, 1] },
        { from: [2, 1], to: [0, 1] },
      ],
    },
  },
  {
    id: 'pll-gc',
    category: 'PLL',
    caseNumber: 'Gc',
    name: 'G-Perm (c)',
    group: 'Adjacent Swap',
    moves: "R2 U' R U' R U R' U R2 D' U R U' R' D",
    difficulty: 3,
    pattern: {
      top: [1, 1, 1, 1, 1, 1, 1, 1, 1],
      arrows: [
        { from: [0, 1], to: [1, 2] },
        { from: [0, 2], to: [2, 2], double: true },
        { from: [1, 0], to: [2, 1] },
        { from: [1, 2], to: [1, 0] },
        { from: [2, 1], to: [0, 1] },
      ],
    },
  },
  {
    id: 'pll-gd',
    category: 'PLL',
    caseNumber: 'Gd',
    name: 'G-Perm (d)',
    group: 'Adjacent Swap',
    moves: "R U R' U' D R2 U' R U' R' U R' U R2 D'",
    difficulty: 3,
    pattern: {
      top: [1, 1, 1, 1, 1, 1, 1, 1, 1],
      arrows: [
        { from: [0, 1], to: [2, 1] },
        { from: [0, 2], to: [2, 2], double: true },
        { from: [1, 0], to: [1, 2] },
        { from: [1, 2], to: [0, 1] },
        { from: [2, 1], to: [1, 0] },
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
    id: 'pll-ja',
    category: 'PLL',
    caseNumber: 'Ja',
    name: 'J-Perm (a)',
    group: 'Adjacent Swap',
    moves: "R' U L' U2 R U' R' U2 R L",
    difficulty: 2,
    pattern: {
      top: [1, 1, 1, 1, 1, 1, 1, 1, 1],
      arrows: [
        { from: [0, 1], to: [1, 2], double: true },
        { from: [0, 2], to: [2, 2], double: true },
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
        { from: [1, 0], to: [2, 1], double: true },
        { from: [2, 0], to: [2, 2], double: true },
      ],
    },
  },
  {
    id: 'pll-na',
    category: 'PLL',
    caseNumber: 'Na',
    name: 'N-Perm (a)',
    group: 'Diagonal Swap',
    moves: "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'",
    difficulty: 3,
    pattern: {
      top: [1, 1, 1, 1, 1, 1, 1, 1, 1],
      arrows: [
        { from: [0, 2], to: [2, 0], double: true },
        { from: [1, 0], to: [1, 2], double: true },
      ],
    },
  },
  {
    id: 'pll-nb',
    category: 'PLL',
    caseNumber: 'Nb',
    name: 'N-Perm (b)',
    group: 'Diagonal Swap',
    moves: "R' U R U' R' F' U' F R U R' F R' F' R U' R",
    difficulty: 3,
    pattern: {
      top: [1, 1, 1, 1, 1, 1, 1, 1, 1],
      arrows: [
        { from: [0, 0], to: [2, 2], double: true },
        { from: [1, 0], to: [1, 2], double: true },
      ],
    },
  },
  {
    id: 'pll-ra',
    category: 'PLL',
    caseNumber: 'Ra',
    name: 'R-Perm (a)',
    group: 'Adjacent Swap',
    moves: "R U' R' U' R U R D R' U' R D' R' U2 R'",
    difficulty: 2,
    pattern: {
      top: [1, 1, 1, 1, 1, 1, 1, 1, 1],
      arrows: [
        { from: [0, 1], to: [1, 2], double: true },
        { from: [2, 0], to: [2, 2], double: true },
      ],
    },
  },
  {
    id: 'pll-rb',
    category: 'PLL',
    caseNumber: 'Rb',
    name: 'R-Perm (b)',
    group: 'Adjacent Swap',
    moves: "R' U2 R U2 R' F R U R' U' R' F' R2",
    difficulty: 2,
    pattern: {
      top: [1, 1, 1, 1, 1, 1, 1, 1, 1],
      arrows: [
        { from: [0, 2], to: [2, 2], double: true },
        { from: [1, 0], to: [2, 1], double: true },
      ],
    },
  },
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
        { from: [1, 0], to: [2, 1] },
        { from: [1, 2], to: [1, 0] },
        { from: [2, 1], to: [1, 2] },
      ],
    },
  },
  {
    id: 'pll-ub',
    category: 'PLL',
    caseNumber: 'Ub',
    name: 'U-Perm (b)',
    group: 'Edges Only',
    moves: "M2 U' M U2 M' U' M2",
    difficulty: 1,
    pattern: {
      top: [1, 1, 1, 1, 1, 1, 1, 1, 1],
      arrows: [
        { from: [1, 0], to: [1, 2] },
        { from: [1, 2], to: [2, 1] },
        { from: [2, 1], to: [1, 0] },
      ],
    },
  },
  {
    id: 'pll-v',
    category: 'PLL',
    caseNumber: 'V',
    name: 'V-Perm',
    group: 'Diagonal Swap',
    moves: "R' U R' U' R D' R' D R' U D' R2 U' R2 D R2",
    difficulty: 3,
    pattern: {
      top: [1, 1, 1, 1, 1, 1, 1, 1, 1],
      arrows: [
        { from: [0, 0], to: [2, 2], double: true },
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
  {
    id: 'pll-z',
    category: 'PLL',
    caseNumber: 'Z',
    name: 'Z-Perm',
    group: 'Edges Only',
    moves: "M2 U M2 U M' U2 M2 U2 M'",
    difficulty: 2,
    pattern: {
      top: [1, 1, 1, 1, 1, 1, 1, 1, 1],
      arrows: [
        { from: [0, 1], to: [1, 0], double: true },
        { from: [1, 2], to: [2, 1], double: true },
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
