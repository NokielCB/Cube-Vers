/**
 * Generatory scramble'i. Domyślnie 3×3 (zgodność wstecz: generateScramble()),
 * a `generateScrambleFor(eventId)` obsługuje wszystkie konkurencje z events.js.
 *
 * Konwencja NxN: nigdy dwa razy z rzędu ta sama ściana; blokujemy też trzeci
 * ruch na tej samej osi (np. U D U), żeby uniknąć redundancji. Dla 4×4
 * dokładamy ruchy szerokie (Rw, Uw…). Pyraminx i Skewb mają własne zasady.
 */
import { getEvent } from './events'

const NxN_FACES = ['U', 'D', 'L', 'R', 'F', 'B']
const MODIFIERS = ['', "'", '2']
const AXIS = { U: 'y', D: 'y', L: 'x', R: 'x', F: 'z', B: 'z' }

function rand(arr) {
  return arr[(Math.random() * arr.length) | 0]
}

/** Scrambler NxN (kostki sześcienne). `wide` włącza ruchy szerokie (dla 4×4+). */
function scrambleCube(size, length, wide) {
  const moves = []
  let prevFace = null
  let prevAxis = null

  while (moves.length < length) {
    const face = rand(NxN_FACES)
    if (face === prevFace) continue // ta sama ściana → odrzuć
    const axis = AXIS[face]
    if (axis === prevAxis && AXIS[prevFace] === axis) continue // trzeci ruch na tej osi → odrzuć

    const mod = rand(MODIFIERS)
    // Ruch szeroki tylko dla kostek ≥4 i losowo (ok. 40%), z bezpiecznym „w".
    const useWide = wide && size >= 4 && Math.random() < 0.4
    moves.push((useWide ? `${face}w` : face) + mod)

    prevAxis = AXIS[prevFace] === axis ? axis : null
    prevFace = face
  }
  return moves.join(' ')
}

/** Pyraminx: ruchy U L R B (', bez 2) + kilka „tips" (małe litery). */
function scramblePyraminx(length) {
  const faces = ['U', 'L', 'R', 'B']
  const mods = ['', "'"]
  const moves = []
  let prev = null
  while (moves.length < length) {
    const f = rand(faces)
    if (f === prev) continue
    moves.push(f + rand(mods))
    prev = f
  }
  // Tips (0–4), każdy jako mała litera z opcjonalnym '.
  const tips = ['u', 'l', 'r', 'b']
  const usedTips = tips.filter(() => Math.random() < 0.5).map((t) => t + rand(mods))
  return [...moves, ...usedTips].join(' ')
}

/** Skewb: ruchy U L R B (', bez 2), bez powtórzeń pod rząd. */
function scrambleSkewb(length) {
  const faces = ['U', 'L', 'R', 'B']
  const mods = ['', "'"]
  const moves = []
  let prev = null
  while (moves.length < length) {
    const f = rand(faces)
    if (f === prev) continue
    moves.push(f + rand(mods))
    prev = f
  }
  return moves.join(' ')
}

/** Scramble dla konkretnej konkurencji (po id z events.js). */
export function generateScrambleFor(eventId) {
  const e = getEvent(eventId)
  if (e.puzzle === 'pyraminx') return scramblePyraminx(e.len)
  if (e.puzzle === 'skewb') return scrambleSkewb(e.len)
  return scrambleCube(e.size, e.len, e.size >= 4)
}

/** Zgodność wstecz — domyślny scramble 3×3 (używany tam, gdzie nie ma eventu). */
export function generateScramble(length = 20) {
  return scrambleCube(3, length, false)
}
