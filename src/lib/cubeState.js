/**
 * cubeState — generyczny symulator kostki NxN dla PODGLĄDU scramble'a (net 2D).
 *
 * Metoda geometryczna: każdą naklejkę trzymamy jako punkt 3D (pozycja + normalna),
 * a ruch to obrót warstwy o 90° wokół osi. Dzięki temu jedna funkcja obsługuje
 * 2×2, 3×3 i 4×4 (także ruchy szerokie „w", slice'y M/E/S i rotacje x/y/z),
 * bez ręcznych tablic permutacji.
 * Na końcu składamy z powrotem 6 tablic ścian (kolory), gotowych do rysowania.
 *
 * Kolory dobrane pod paletę aplikacji (te same co StudioCube).
 */
export const FACE_COLORS = {
  U: '#F4F3EE',
  R: '#A6544B',
  F: '#5F7A63',
  D: '#C9A961',
  L: '#C08552',
  B: '#4C6B82',
}
export const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B']

const NRM = {
  U: { x: 0, y: 1, z: 0 },
  D: { x: 0, y: -1, z: 0 },
  F: { x: 0, y: 0, z: 1 },
  B: { x: 0, y: 0, z: -1 },
  R: { x: 1, y: 0, z: 0 },
  L: { x: -1, y: 0, z: 0 },
}

// (face,i,j) → pozycja 3D naklejki (i = wiersz od góry, j = kolumna od lewej).
function toCoord(face, i, j, M) {
  switch (face) {
    case 'U': return { x: j, y: M, z: i }
    case 'D': return { x: j, y: 0, z: M - i }
    case 'F': return { x: j, y: M - i, z: M }
    case 'B': return { x: M - j, y: M - i, z: 0 }
    case 'R': return { x: M, y: M - i, z: M - j }
    case 'L': return { x: 0, y: M - i, z: j }
    default: return { x: 0, y: 0, z: 0 }
  }
}

// pozycja 3D → (i,j) na danej ścianie (odwrotność toCoord).
function fromCoord(face, p, M) {
  switch (face) {
    case 'U': return [p.z, p.x]
    case 'D': return [M - p.z, p.x]
    case 'F': return [M - p.y, p.x]
    case 'B': return [M - p.y, M - p.x]
    case 'R': return [M - p.y, M - p.z]
    case 'L': return [M - p.y, p.z]
    default: return [0, 0]
  }
}

function faceFromNrm(n) {
  const x = Math.round(n.x)
  const y = Math.round(n.y)
  const z = Math.round(n.z)
  if (x === 1) return 'R'
  if (x === -1) return 'L'
  if (y === 1) return 'U'
  if (y === -1) return 'D'
  if (z === 1) return 'F'
  return 'B'
}

// Obrót wektora o 90° wokół osi (dir: +1 = CCW patrząc z + strony osi, -1 = CW).
function rot(axis, dir, v) {
  const { x, y, z } = v
  if (axis === 'x') return dir > 0 ? { x, y: -z, z: y } : { x, y: z, z: -y }
  if (axis === 'y') return dir > 0 ? { x: z, y, z: -x } : { x: -z, y, z: x }
  return dir > 0 ? { x: -y, y: x, z } : { x: y, y: -x, z } // axis z
}

// Znak obrotu odpowiadający STANDARDOWEMU (CW z zewnątrz) obrotowi danej ściany.
const FACE_AXIS = { U: 'y', D: 'y', R: 'x', L: 'x', F: 'z', B: 'z' }
const FACE_SIGN = { U: -1, D: 1, R: -1, L: 1, F: -1, B: 1 }

function inLayer(face, p, M, w) {
  switch (face) {
    case 'U': return p.y >= M - w + 1
    case 'D': return p.y <= w - 1
    case 'R': return p.x >= M - w + 1
    case 'L': return p.x <= w - 1
    case 'F': return p.z >= M - w + 1
    case 'B': return p.z <= w - 1
    default: return false
  }
}

// Warstwy ŚRODKOWE (slice M/E/S) — wszystko poza dwiema skrajnymi na danej osi.
const inMiddle = (axis, p, M) => p[axis] > 0 && p[axis] < M

// Slice'y i rotacje kręcą się tak jak ściana, którą naśladują (konwencja WCA):
// M jak L, E jak D, S jak F; rotacja x jak R, y jak U, z jak F.
const SLICE_AS = { M: 'L', E: 'D', S: 'F' }
const ROTATION_AS = { x: 'R', y: 'U', z: 'F' }

// Obrót o 90° wszystkich naklejek, które spełniają `select` (warstwa/warstwy).
function applyQuarter(stickers, axis, dir, select, M) {
  const c = M / 2
  for (const s of stickers) {
    if (!select(s.pos)) continue
    // pozycja: obrót wokół środka kostki
    const rel = { x: s.pos.x - c, y: s.pos.y - c, z: s.pos.z - c }
    const rr = rot(axis, dir, rel)
    s.pos = { x: Math.round(rr.x + c), y: Math.round(rr.y + c), z: Math.round(rr.z + c) }
    // normalna: obrót wokół początku układu
    s.nrm = rot(axis, dir, s.nrm)
  }
}

// Parsowanie i wykonanie jednego tokenu ruchu. Obsługujemy:
//   ściany "R", "F2", "U'" · wide "Rw", "Uw'" i małe "r", "f" · slice "M2", "E'", "S"
//   · rotacje całej kostki "x", "y'", "z2". Algorytmy (setup w treningu) używają
//   ich wszystkich, zwykłe scramble'e — tylko ścian i wide.
function applyToken(stickers, token, M) {
  const m = token.match(/^([UDLRFBudlrfbMESxyz])(w)?(['2]*)$/)
  if (!m) return
  const [, head, wide, suffix] = m

  let face
  let select
  if (SLICE_AS[head]) {
    face = SLICE_AS[head]
    select = (p) => inMiddle(FACE_AXIS[face], p, M)
  } else if (ROTATION_AS[head]) {
    face = ROTATION_AS[head]
    select = () => true // cała kostka
  } else {
    face = head.toUpperCase()
    const w = wide || head !== face ? 2 : 1 // "Rw" albo małe "r" = dwie warstwy
    select = (p) => inLayer(face, p, M, w)
  }

  const base = FACE_SIGN[face]
  // "2" wygrywa z apostrofem ("U2'" to też pół obrotu).
  const turns = suffix.includes('2') ? 2 : 1
  const dir = turns === 1 && suffix.includes("'") ? -base : base
  for (let i = 0; i < turns; i++) applyQuarter(stickers, FACE_AXIS[face], dir, select, M)
}

/**
 * Zwraca stan kostki NxN po wykonaniu scramble'a jako mapę ścian → tablica
 * kolorów (row-major, długość N*N). Pusty scramble = kostka ułożona.
 */
export function simulateCube(scramble, N) {
  const M = N - 1
  const stickers = []
  for (const face of FACE_ORDER) {
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        stickers.push({ pos: toCoord(face, i, j, M), nrm: { ...NRM[face] }, color: FACE_COLORS[face] })
      }
    }
  }

  const tokens = (scramble || '').trim().split(/\s+/).filter(Boolean)
  for (const t of tokens) applyToken(stickers, t, M)

  const faces = {}
  for (const f of FACE_ORDER) faces[f] = new Array(N * N).fill(null)
  for (const s of stickers) {
    const f = faceFromNrm(s.nrm)
    const [i, j] = fromCoord(f, s.pos, M)
    faces[f][i * N + j] = s.color
  }
  return faces
}
