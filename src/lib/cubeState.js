/**
 * cubeState — generyczny symulator kostki NxN dla PODGLĄDU scramble'a (net 2D).
 *
 * Metoda geometryczna: każdą naklejkę trzymamy jako punkt 3D (pozycja + normalna),
 * a ruch to obrót warstwy o 90° wokół osi. Dzięki temu jedna funkcja obsługuje
 * 2×2, 3×3 i 4×4 (także ruchy szerokie „w"), bez ręcznych tablic permutacji.
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

function applyQuarter(stickers, face, M, w, dir) {
  const axis = FACE_AXIS[face]
  const c = M / 2
  for (const s of stickers) {
    if (!inLayer(face, s.pos, M, w)) continue
    // pozycja: obrót wokół środka kostki
    const rel = { x: s.pos.x - c, y: s.pos.y - c, z: s.pos.z - c }
    const rr = rot(axis, dir, rel)
    s.pos = { x: Math.round(rr.x + c), y: Math.round(rr.y + c), z: Math.round(rr.z + c) }
    // normalna: obrót wokół początku układu
    s.nrm = rot(axis, dir, s.nrm)
  }
}

// Parsowanie i wykonanie jednego tokenu ruchu (np. "R", "Uw'", "F2", "Rw2").
function applyToken(stickers, token, M) {
  const m = token.match(/^([UDLRFB])(w)?(['2])?$/)
  if (!m) return
  const face = m[1]
  const w = m[2] ? 2 : 1
  const suffix = m[3]
  const base = FACE_SIGN[face]
  if (suffix === '2') {
    applyQuarter(stickers, face, M, w, base)
    applyQuarter(stickers, face, M, w, base)
  } else if (suffix === "'") {
    applyQuarter(stickers, face, M, w, -base)
  } else {
    applyQuarter(stickers, face, M, w, base)
  }
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
