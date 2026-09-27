import { useState } from 'react'
import { LayoutGrid } from 'lucide-react'
import { FACES, FACE_PL } from '../../lib/moves'
import TurnArrow from './TurnArrow'

/**
 * NotationGrid — lewa kolumna Notation Studio: szklane kafelki-bento, każdy
 * wysyła jeden token notacji do głównej kostki (prop `onMove`). Kafelek NIE
 * renderuje żadnego WebGL — tylko DOM + SVG (`TurnArrow`), więc cała siatka
 * jest praktycznie darmowa w GPU; cały ciężar 3D niesie jedna `StudioCube`.
 *
 * Kierunek (zgodnie / przeciwnie do zegara) to WŁAŚCIWOŚĆ kafelka, nie osobny
 * token: mały przycisk „′" w rogu przełącza lokalny stan `prime`, strzałka się
 * odbija, a klik w środek kafelka wysyła bazowy token albo token z apostrofem.
 *
 * `isCooldown` (z SyntaxPage) blokuje TYLKO przycisk wysyłający ruch — natywny
 * atrybut `disabled` daje za darmo kursor `not-allowed` i realnie odrzuca klik
 * (nie tylko wizualnie), a przycisk „′" zostaje aktywny, bo samo przełączenie
 * kierunku niczego nie animuje.
 */

const BASIC_GROUP = FACES.map((f) => ({ token: f, label: `Ściana: ${FACE_PL[f]}` }))
const WIDE_GROUP = FACES.map((f) => ({ token: `${f}w`, label: `${FACE_PL[f]} + środek` }))
const ROTATION_GROUP = [
  { token: 'x', label: 'cała kostka — jak R' },
  { token: 'y', label: 'cała kostka — jak U' },
  { token: 'z', label: 'cała kostka — jak F' },
]

function MoveTile({ token, label, onMove, isCooldown }) {
  const [prime, setPrime] = useState(false)

  return (
    <div
      className={`group relative flex w-[104px] shrink-0 snap-center flex-col items-center rounded-3xl border p-3.5 transition-opacity duration-300 md:w-auto md:shrink ${
        isCooldown
          ? 'border-ink-900/[0.04] bg-white/25 opacity-40'
          : 'border-ink-900/[0.06] bg-white/45 hover:border-ink-900/15 hover:bg-white/70'
      }`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setPrime((p) => !p)
        }}
        aria-label="odwróć kierunek obrotu"
        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full font-mono text-sm text-ink-300 transition-colors duration-200 hover:bg-ink-900/[0.05] hover:text-ink-950"
      >
        ′
      </button>

      <button
        type="button"
        disabled={isCooldown}
        onClick={() => onMove(prime ? `${token}'` : token)}
        className="flex w-full flex-col items-center gap-1 pt-1 disabled:cursor-not-allowed"
      >
        <span className="font-mono text-2xl font-semibold leading-none tracking-tight text-ink-950">
          {token}
          {prime && <span className="text-ink-400">′</span>}
        </span>
        <TurnArrow
          reverse={prime}
          className="my-1.5 h-8 w-8 text-ink-300 transition-colors duration-300 group-hover:text-ink-600"
        />
        <span className="h-7 text-center text-[10px] leading-tight text-ink-400">{label}</span>
      </button>
    </div>
  )
}

function MoveGroup({ title, hint, moves, onMove, isCooldown }) {
  return (
    <div>
      <div className="mb-3 flex items-baseline gap-2">
        <h3 className="text-sm font-semibold tracking-tight text-ink-950">{title}</h3>
        <span className="text-[11px] text-ink-400">{hint}</span>
      </div>
      {/* mobile: pozioma karuzela ze snap-points (swipe lewo/prawo, przewijanie
          natywne = 60 fps na GPU). Ujemny margines = wewnętrzny padding kafelka
          (p-5 → mx-5, sm:p-6 → mx-6), żeby pierwszy kafelek karuzeli był
          wyrównany do tekstu nad nią, a ostatni „dotykał" krawędzi.
          Desktop (md+): klasyczna siatka 3 kolumn. */}
      <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-px-5 px-5 pb-1 sm:-mx-6 sm:scroll-px-6 sm:px-6 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:scroll-px-0 md:px-0 md:pb-0">
        {moves.map((m) => (
          <MoveTile key={m.token} token={m.token} label={m.label} onMove={onMove} isCooldown={isCooldown} />
        ))}
      </div>
    </div>
  )
}

/**
 * @param {{ onMove: (token:string)=>void, isCooldown: boolean }} props
 */
export default function NotationGrid({ onMove, isCooldown }) {
  return (
    <section className="tile flex h-full flex-col p-5 sm:p-6 lg:p-8">
      <div className="flex items-center gap-2 text-ink-400">
        <LayoutGrid size={16} strokeWidth={1.5} />
        <span className="text-[11px] font-medium uppercase tracking-[0.14em]">Notation Grid</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">
        Kliknij kafelek, aby wysłać ruch do kostki. Przycisk „′" w rogu odwraca kierunek.
      </p>

      <div className="mt-8 flex flex-1 flex-col justify-between gap-8">
        <MoveGroup
          title="Basic Moves"
          hint="jedna ściana"
          moves={BASIC_GROUP}
          onMove={onMove}
          isCooldown={isCooldown}
        />
        <MoveGroup
          title="Double Layers"
          hint="ściana + warstwa środkowa"
          moves={WIDE_GROUP}
          onMove={onMove}
          isCooldown={isCooldown}
        />
        <MoveGroup
          title="Rotations"
          hint="cała kostka"
          moves={ROTATION_GROUP}
          onMove={onMove}
          isCooldown={isCooldown}
        />
      </div>
    </section>
  )
}
