/**
 * notation.js — cienka warstwa rozumienia notacji WCA.
 *
 * Kluczowa różnica, o którą rozbija się większość edytorów algorytmów:
 *   • RUCH ŚCIANY  (R U F, wide r/u, slice M/E/S) — realnie miesza kostkę,
 *   • ROTACJA CAŁEJ KOSTKI (x, y, z + ' / 2) — NIE miesza; to tylko zmiana
 *     orientacji w dłoniach ("z tej strony zacznij"). W bazach speedcubingowych
 *     alternatywy często zaczynają się od takiej rotacji (np. "y R U R' U'").
 *
 * Traktowanie "y" jak zwykłego ruchu psuje zapis i wizualizację, dlatego
 * rotacje wydzielamy jako osobny byt (orientation cue), zamiast doklejać je
 * do sekwencji do nauki.
 */

// Tylko x, y, z to rotacje całej kostki. Uwaga: wide (Rw/r) i slice (M/E/S)
// to NIE rotacje — one faktycznie zmieniają stan kostki.
const ROTATION_RE = /^[xyz](['2])?$/

/** Czy token to rotacja całej kostki (x, y, z, x', y2, …)? */
export function isRotation(token = '') {
  return ROTATION_RE.test(token)
}

/**
 * Oddziela WIODĄCĄ rotację orientacyjną od właściwej sekwencji ruchów.
 * Zdejmujemy tylko rotacje z początku — rotacja w środku algorytmu realnie
 * przeorientowuje kolejne ruchy, więc jej nie ruszamy (zostaje w `moves`).
 *
 *   "y R U R' U'"      → { rotation: "y",     moves: "R U R' U'" }
 *   "y2 R U R'"        → { rotation: "y2",    moves: "R U R'" }
 *   "R U R'"           → { rotation: "",      moves: "R U R'" }
 *
 * @param {string} sequence
 * @returns {{ rotation: string, moves: string }}
 */
export function splitOrientation(sequence = '') {
  const tokens = String(sequence).trim().split(/\s+/).filter(Boolean)
  const rotation = []
  while (tokens.length && isRotation(tokens[0])) rotation.push(tokens.shift())
  return { rotation: rotation.join(' '), moves: tokens.join(' ') }
}

/**
 * Odwrotność sekwencji — „cofnięcie" algorytmu. Czytamy ruchy OD KOŃCA
 * i każdemu odwracamy kierunek: R → R', R' → R, a R2 zostaje R2 (pół obrotu
 * w obie strony to to samo). Działa też dla wide (Rw, r), slice (M) i rotacji.
 *
 * Po co: to jest SETUP do treningu. Wykonaj odwrotność na ułożonej kostce,
 * a sam algorytm doprowadzi ją z powrotem do stanu ułożonego.
 *
 *   "R U R' U'"   → "U R U' R'"
 *   "R U2' R'"    → "R U2 R'"
 */
export function invertSequence(sequence = '') {
  return String(sequence)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .reverse()
    .map(invertToken)
    .join(' ')
}

function invertToken(token) {
  const base = token.replace(/['2]+$/, '') // "U2'" → "U", "Rw'" → "Rw"
  if (token.includes('2')) return `${base}2`
  return token.endsWith("'") ? base : `${base}'`
}

/**
 * Twarde czyszczenie: usuwa WSZYSTKIE rotacje z ciągu (także środkowe).
 * Używać świadomie — dobre do etykiet/porównań, nie do wiernego odtwarzania.
 */
export function stripRotations(sequence = '') {
  return String(sequence)
    .trim()
    .split(/\s+/)
    .filter((t) => t && !isRotation(t))
    .join(' ')
}
