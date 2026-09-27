/**
 * CubeDiagram — widok ściany U (przypadek OLL/PLL) jako czysty, data-driven SVG.
 *
 * Wersja premium/minimal: matowa ochra zamiast jaskrawej żółci,
 * "puste" pola niemal wtapiają się w szkliste tło karty,
 * strzałki permutacji w grafitowej kresce 1.5px.
 *
 * pattern.top    — 9 × (1|0): naklejki na ścianie U (wiersze od tyłu do przodu)
 * pattern.sides  — { n, e, s, w: [3 × (1|0)] }: naklejki widoczne z boków
 * pattern.arrows — (PLL) [{ from: [row, col], to: [row, col], double }]
 */
import { useId } from 'react'

const CELL = 32
const GAP = 4
const O = 16
const T = 7
const SOFF = 3
const SPAN = 3 * CELL + 2 * GAP

const pos = (i) => O + i * (CELL + GAP)
const center = ([r, c]) => [pos(c) + CELL / 2, pos(r) + CELL / 2]

const shrink = ([x1, y1], [x2, y2], d = 9) => {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const ux = (dx / len) * d
  const uy = (dy / len) * d
  return [x1 + ux, y1 + uy, x2 - ux, y2 - uy]
}

const SIDE_RECTS = {
  n: (i) => ({ x: pos(i), y: O - SOFF - T, width: CELL, height: T }),
  s: (i) => ({ x: pos(i), y: O + SPAN + SOFF, width: CELL, height: T }),
  w: (i) => ({ x: O - SOFF - T, y: pos(i), width: T, height: CELL }),
  e: (i) => ({ x: O + SPAN + SOFF, y: pos(i), width: T, height: CELL }),
}

// Matowa paleta — zero neonów
const ON_FILL = '#C9A961' // ochra
const ON_STROKE = 'rgba(146,117,55,0.35)'
const OFF_FILL = 'rgba(20,18,12,0.05)' // wtapia się w szkło
const OFF_STROKE = 'rgba(20,18,12,0.08)'
const ARROW = '#171717'

export default function CubeDiagram({ pattern, className = '' }) {
  const uid = useId().replace(/[:]/g, '')
  const { top = [], sides = {}, arrows = [] } = pattern
  const ah = `ah-${uid}`

  return (
    <svg viewBox="0 0 136 136" className={className} aria-hidden="true">
      <defs>
        <marker
          id={ah}
          viewBox="0 0 8 8"
          refX="6.5"
          refY="4"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L8,4 L0,8 Z" fill={ARROW} />
        </marker>
      </defs>

      {/* paski boczne */}
      {Object.entries(SIDE_RECTS).map(([key, rect]) =>
        (sides[key] ?? [0, 0, 0]).map((on, i) => (
          <rect
            key={`${key}${i}`}
            {...rect(i)}
            rx="2.5"
            fill={on ? ON_FILL : OFF_FILL}
            stroke={on ? ON_STROKE : OFF_STROKE}
            strokeWidth="1"
          />
        )),
      )}

      {/* ściana U */}
      {Array.from({ length: 9 }, (_, i) => {
        const on = !!top[i]
        return (
          <rect
            key={i}
            x={pos(i % 3)}
            y={pos(Math.floor(i / 3))}
            width={CELL}
            height={CELL}
            rx="8"
            fill={on ? ON_FILL : OFF_FILL}
            stroke={on ? ON_STROKE : OFF_STROKE}
            strokeWidth="1"
          />
        )
      })}

      {/* strzałki permutacji (PLL) — cienka grafitowa kreska */}
      {arrows.map((a, i) => {
        const [x1, y1, x2, y2] = shrink(center(a.from), center(a.to))
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={ARROW}
            strokeWidth="1.5"
            strokeLinecap="round"
            markerEnd={`url(#${ah})`}
            markerStart={a.double ? `url(#${ah})` : undefined}
          />
        )
      })}
    </svg>
  )
}
