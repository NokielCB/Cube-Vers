import { isRotation } from '../../lib/notation'

/**
 * Notation — sekwencja ruchów jako rząd spokojnych „klawiszy" (mono).
 * Wspólna dla modalu algorytmu i widoku treningu.
 *
 * @param {{ moves: string, tone?: 'default'|'muted' }} props
 */
export default function Notation({ moves, tone = 'default' }) {
  const chip =
    tone === 'muted'
      ? 'border-ink-900/[0.06] bg-white/50 text-ink-500'
      : 'border-ink-900/[0.06] bg-ink-900/[0.03] text-ink-700'
  return (
    <div className="flex flex-wrap gap-1.5 font-mono text-[13px]">
      {moves
        .split(' ')
        .filter(Boolean)
        .map((m, i) =>
          // Rotacja całej kostki to wskazówka orientacji, a nie ruch —
          // renderujemy ją inaczej (przerywana, kursywa), żeby nigdy nie
          // wyglądała jak zwykły token R/U/F.
          isRotation(m) ? (
            <span
              key={`${m}-${i}`}
              title="Rotacja całej kostki — orientacja startowa"
              className="rounded-lg border border-dashed border-ink-900/15 px-1.5 py-0.5 italic text-ink-400"
            >
              {m}
            </span>
          ) : (
            <span key={`${m}-${i}`} className={`rounded-lg border px-1.5 py-0.5 ${chip}`}>
              {m}
            </span>
          ),
        )}
    </div>
  )
}
