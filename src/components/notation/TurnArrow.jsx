import { useId } from 'react'

/**
 * TurnArrow — minimalistyczna, wektorowa strzałka kierunku obrotu (SVG).
 *
 * Rysujemy ~270° łuk ze strzałką na końcu — czytelne "w prawo" (zgodnie z
 * zegarem) w spoczynku; prop `reverse` odbija łuk w poziomie, więc ten sam
 * kształt czyta się jako "w lewo" (przeciwnie do zegara) bez osobnego SVG.
 *
 * `useId()` generuje unikalny id dla <marker>, bo id grotu strzałki żyje w
 * globalnej przestrzeni nazw dokumentu — bez tego dwie strzałki na stronie
 * (np. kilkanaście kafelków w Notation Grid) podkradałyby sobie ten sam grot.
 */
export default function TurnArrow({ reverse = false, className = 'h-8 w-8' }) {
  const markerId = `turn-arrow-head-${useId()}`

  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      style={reverse ? { transform: 'scaleX(-1)' } : undefined}
      aria-hidden="true"
    >
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 8 8"
          refX="4.5"
          refY="4"
          markerWidth="4.5"
          markerHeight="4.5"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" />
        </marker>
      </defs>
      <path
        d="M 8 8 A 11 11 0 1 1 6.5 22.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        markerEnd={`url(#${markerId})`}
      />
    </svg>
  )
}
