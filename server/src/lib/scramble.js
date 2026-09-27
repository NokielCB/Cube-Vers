/**
 * Serwerowy generator scramble'a 3x3 (port frontendowego src/lib/scramble.js).
 *
 * DLACZEGO NA SERWERZE: w trybie sieciowym scramble MUSI powstać po stronie
 * serwera i zostać rozesłany do obu graczy identyczny. Gdyby generował go
 * klient, jeden z graczy znałby układ wcześniej albo mógłby go podmienić —
 * to byłby wektor oszustwa. Serwer = jedyne źródło prawdy.
 */

const FACES = ['U', 'D', 'L', 'R', 'F', 'B']
const MODIFIERS = ['', "'", '2']
const AXIS = { U: 'y', D: 'y', L: 'x', R: 'x', F: 'z', B: 'z' }

export function generateScramble(length = 20) {
  const moves = []
  let prevFace = null
  let prevAxis = null

  while (moves.length < length) {
    const face = FACES[(Math.random() * FACES.length) | 0]
    if (face === prevFace) continue

    const axis = AXIS[face]
    if (axis === prevAxis && AXIS[prevFace] === axis) continue

    const mod = MODIFIERS[(Math.random() * MODIFIERS.length) | 0]
    moves.push(face + mod)

    prevAxis = AXIS[prevFace] === axis ? axis : null
    prevFace = face
  }

  return moves.join(' ')
}
