/**
 * moves.js — JEDNO źródło prawdy o notacji ruchów WCA dla całej apki.
 *
 * Każda litera notacji = obrót jednej WARSTWY wokół jednej OSI. Trzymamy to
 * w jednej tabeli, z której korzysta i wizualizacja (Cube3D, MiniCube), i
 * trenażer (sprawdzanie poprawności). Dzięki temu „co znaczy F'" jest
 * zdefiniowane dokładnie raz — nie ma szans, żeby podgląd i test się rozjechały.
 *
 * Konwencja osi (prawoskrętny układ Three.js):
 *   x → prawo (R/L), y → góra (U/D), z → przód (F/B).
 * `dir` to znak obrotu wokół DODATNIej osi tak, aby ruch bez apostrofu był
 * zgodny z zegarem patrząc na daną ścianę z zewnątrz. Apostrof (') odwraca
 * znak, a „2" podwaja kąt (180°).
 */

export const FACE = {
  R: { axis: 'x', layer: 1, dir: -1 },
  L: { axis: 'x', layer: -1, dir: 1 },
  U: { axis: 'y', layer: 1, dir: -1 },
  D: { axis: 'y', layer: -1, dir: 1 },
  F: { axis: 'z', layer: 1, dir: -1 },
  B: { axis: 'z', layer: -1, dir: 1 },
}

/**
 * Pojedynczy token (np. "R", "U'", "F2") → opis obrotu, albo null gdy to nie
 * jest czysty ruch ściany (rotacje x/y/z, wide r/u, slice M/E/S pomijamy).
 * @returns {null | { token, face, axis:'x'|'y'|'z', layer:1|-1, dir:1|-1, turns:1|2 }}
 */
export function parseMove(token = '') {
  const base = FACE[token[0]]
  if (!base) return null
  return {
    token,
    face: token[0],
    axis: base.axis,
    layer: base.layer,
    dir: token.includes("'") ? -base.dir : base.dir,
    turns: token.includes('2') ? 2 : 1,
  }
}

/** Cała sekwencja → lista sparsowanych ruchów (nie-ruchy są pomijane). */
export function parseMoves(notation = '') {
  const out = []
  for (const tok of String(notation).trim().split(/\s+/)) {
    const m = parseMove(tok)
    if (m) out.push(m)
  }
  return out
}

/**
 * Zestaw podstawowy dla Słownika i Trenażera. Prime (') = przeciwnie do
 * ruchu wskazówek zegara patrząc na daną ścianę z zewnątrz.
 */
export const BASIC_MOVES = [
  { token: 'R', label: 'Prawa ściana, zgodnie z zegarem' },
  { token: "R'", label: 'Prawa ściana, przeciwnie do zegara' },
  { token: 'U', label: 'Górna ściana, zgodnie z zegarem' },
  { token: "U'", label: 'Górna ściana, przeciwnie do zegara' },
  { token: 'F', label: 'Przednia ściana, zgodnie z zegarem' },
  { token: "F'", label: 'Przednia ściana, przeciwnie do zegara' },
]

// Rotacje całej kostki — kierunek zgodny z odpowiadającym ruchem ściany
// (x jak R, y jak U, z jak F).
const ROTATION = {
  x: { axis: 'x', dir: FACE.R.dir },
  y: { axis: 'y', dir: FACE.U.dir },
  z: { axis: 'z', dir: FACE.F.dir },
}

/**
 * visualMove — BOGATSZY parser na potrzeby wizualizacji (Słownik notacji).
 * W przeciwieństwie do parseMove obsługuje TRZY rodziny ruchów jako obrót
 * ZBIORU warstw wokół jednej osi:
 *   • ściana  (R, U', F2)      → jedna warstwa            layers=[±1]
 *   • wide    (Rw, rw, Uw')    → dwie warstwy (ściana+środek) layers=[±1, 0]
 *   • rotacja (x, y', z)       → cała kostka               layers=[-1,0,1]
 *
 * Rozdzielamy to od parseMove celowo: Cube3D odtwarza SEKWENCJE algorytmów i
 * ma świadomie ignorować rotacje/wide (inaczej „y" kręciłoby całą sceną).
 * Tu, w słowniku, chcemy je pokazać — więc osobny, jawny kontrakt.
 *
 * @returns {null | { token, axis, layers:number[], dir:1|-1, turns:1|2 }}
 */
export function visualMove(token = '') {
  const prime = token.includes("'")
  const turns = token.includes('2') ? 2 : 1
  const head = token[0]
  const low = head.toLowerCase()

  // 1) rotacja całej kostki: x / y / z
  if (ROTATION[low] && head === low && token.length <= 2) {
    const r = ROTATION[low]
    return { token, axis: r.axis, layers: [-1, 0, 1], dir: prime ? -r.dir : r.dir, turns }
  }

  // 2) ruch dwuwarstwowy: "Rw" (druga litera 'w') lub małą literą "r"/"u"…
  const faceKey = head.toUpperCase()
  const base = FACE[faceKey]
  if (!base) return null
  const isWide = token[1] === 'w' || (head === low && FACE[faceKey])
  const dir = prime ? -base.dir : base.dir

  return {
    token,
    axis: base.axis,
    layers: isWide ? [base.layer, 0] : [base.layer],
    dir,
    turns,
  }
}

// Pełna baza notacji dla Słownika — pogrupowana na sekcje bento.
// Eksportowane też do Notation Studio (NotationGrid) — jedno źródło liter i etykiet PL.
export const FACES = ['R', 'L', 'U', 'D', 'F', 'B']
export const FACE_PL = { R: 'prawa', L: 'lewa', U: 'górna', D: 'dolna', F: 'przednia', B: 'tylna' }

export const MOVE_CATALOG = [
  {
    title: 'Ściany',
    hint: 'obrót jednej ściany o 90° zgodnie z zegarem',
    moves: FACES.map((f) => ({ token: f, label: `Ściana ${FACE_PL[f]}` })),
  },
  {
    title: "Odwrotne ( ' )",
    hint: 'ta sama ściana, ale przeciwnie do zegara',
    moves: FACES.map((f) => ({ token: `${f}'`, label: `${FACE_PL[f]} — przeciwnie` })),
  },
  {
    title: 'Podwójne ( 2 )',
    hint: 'obrót o 180°',
    moves: FACES.map((f) => ({ token: `${f}2`, label: `${FACE_PL[f]} — 180°` })),
  },
  {
    title: 'Dwuwarstwowe ( w )',
    hint: 'ściana razem z warstwą środkową',
    moves: FACES.map((f) => ({ token: `${f}w`, label: `dwie warstwy: ${FACE_PL[f]}` })),
  },
  {
    title: 'Rotacje kostki',
    hint: 'obrót CAŁEJ kostki — nic nie miesza, zmienia tylko orientację',
    moves: [
      { token: 'x', label: 'cała kostka — jak R' },
      { token: 'y', label: 'cała kostka — jak U' },
      { token: 'z', label: 'cała kostka — jak F' },
      { token: "x'", label: 'cała kostka — jak R′' },
      { token: "y'", label: 'cała kostka — jak U′' },
      { token: "z'", label: 'cała kostka — jak F′' },
    ],
  },
]
