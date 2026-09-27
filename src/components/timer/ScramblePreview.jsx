import { useMemo } from 'react'
import { simulateCube } from '../../lib/cubeState'

/**
 * ScramblePreview — mały podgląd 2D (net) stanu kostki NxN po scramble'u.
 * Rysuje sześć ścian w klasycznym „krzyżu":
 *          [U]
 *      [L] [F] [R] [B]
 *          [D]
 * Dla konkurencji bez podglądu (pyraminx/skewb) komponent nie jest używany.
 */
export default function ScramblePreview({ scramble, size = 3, className = '' }) {
  const faces = useMemo(() => simulateCube(scramble, size), [scramble, size])
  if (!size || size < 2) return null

  const cell = size <= 3 ? 11 : 8
  const faceW = size * cell
  const gap = 6
  const step = faceW + gap
  const width = 4 * faceW + 3 * gap
  const height = 3 * faceW + 2 * gap

  // Pozycja lewego-górnego rogu każdej ściany (w px).
  const pos = {
    U: [step, 0],
    L: [0, step],
    F: [step, step],
    R: [2 * step, step],
    B: [3 * step, step],
    D: [step, 2 * step],
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label="Podgląd ułożenia po scramble'u"
    >
      {Object.entries(pos).map(([face, [ox, oy]]) =>
        faces[face].map((color, idx) => {
          const i = Math.floor(idx / size)
          const j = idx % size
          return (
            <rect
              key={`${face}-${idx}`}
              x={ox + j * cell + 0.6}
              y={oy + i * cell + 0.6}
              width={cell - 1.2}
              height={cell - 1.2}
              rx={1.6}
              fill={color}
              stroke="rgba(0,0,0,0.14)"
              strokeWidth={0.6}
            />
          )
        }),
      )}
    </svg>
  )
}
