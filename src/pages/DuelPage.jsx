import { motion } from 'framer-motion'
import { ArrowLeft, Globe, Swords, Users, ChevronRight } from 'lucide-react'
import ArenaPage from './ArenaPage'
import OnlineArenaPage from './OnlineArenaPage'

/**
 * DuelPage — WSPÓLNA sekcja pojedynków. Łączy dawne dwie osobne zakładki
 * (Local Duel + Online Duel) w jedną: na wejściu pokazuje ekran wyboru trybu
 * (dwa kafle), a po wyborze renderuje odpowiedni tryb z paskiem powrotu i
 * szybkim przełącznikiem Lokalnie / Online.
 *
 * `mode` (null | 'local' | 'online') trzyma App — dzięki temu wejście z wyzwania
 * (Social Hub) może od razu ustawić 'online', z pominięciem ekranu wyboru.
 *
 * @param {{ mode: 'local'|'online'|null, onSelectMode: (m)=>void, duels: object[], onDuel: (d)=>void }} props
 */

const MODES = [
  {
    id: 'local',
    label: 'Local Duel',
    tagline: 'Jedna klawiatura, wspólny zegar',
    desc: 'Dwie osoby przy jednym urządzeniu. Jeden zegar, dwa splity — pierwsza spacja zamraża czas szybszego, druga kończy pojedynek.',
    Icon: Swords,
  },
  {
    id: 'online',
    label: 'Online Duel',
    tagline: 'Gracz vs gracz przez internet',
    desc: 'Stwórz pokój albo dołącz kodem. Wspólny scramble, Twój zegar po lewej, rywal na żywo po prawej. Werdykt liczy serwer.',
    Icon: Globe,
  },
]

/**
 * Polska odmiana liczebnika: 1 pojedynek, 2–4 pojedynki (ale 12–14 pojedynków),
 * 5+ pojedynków. Liczy się końcówka liczby, stąd `% 10` i `% 100`.
 */
function duelsLabel(n) {
  if (n === 1) return '1 pojedynek'
  const last = n % 10
  const lastTwo = n % 100
  const few = last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)
  return `${n} ${few ? 'pojedynki' : 'pojedynków'}`
}

/** Ekran wyboru trybu — dwa duże kafle bento. */
function ModeSelect({ onSelect, duels }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-24 md:pt-10 lg:px-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 22 }}
        className="flex items-center gap-2 text-ink-400"
      >
        <Swords size={16} strokeWidth={1.5} />
        <span className="text-[11px] font-medium uppercase tracking-[0.14em]">Duel</span>
      </motion.div>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink-950 sm:text-5xl">
        Wybierz tryb pojedynku.
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-500">
        Dwa sposoby na wyścig: obok siebie na jednym urządzeniu, albo z kimkolwiek przez internet.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {MODES.map(({ id, label, tagline, desc, Icon }, i) => (
          <motion.button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 22, delay: 0.05 + i * 0.05 }}
            whileHover={{ y: -3 }}
            className="tile group flex flex-col items-start p-6 text-left transition-shadow hover:shadow-soft-lg sm:p-8"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-900/[0.05] text-ink-950">
              <Icon size={22} strokeWidth={1.6} />
            </span>
            <div className="mt-5 flex w-full items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight text-ink-950">{label}</h2>
              <ChevronRight
                size={18}
                className="text-ink-300 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-ink-600"
              />
            </div>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-400">
              {tagline}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-500">{desc}</p>
            {id === 'local' && duels.length > 0 && (
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-ink-900/[0.04] px-3 py-1 text-xs text-ink-500">
                <Users size={12} strokeWidth={1.8} /> {duelsLabel(duels.length)} w historii
              </span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

/** Pasek nad areną: powrót do wyboru + szybki przełącznik trybu. */
function DuelTopBar({ mode, onSelectMode }) {
  return (
    <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 pt-6 sm:px-6 md:pt-10 lg:px-10">
      <button
        type="button"
        onClick={() => onSelectMode(null)}
        className="flex items-center gap-1.5 rounded-full border border-ink-900/[0.08] bg-white/50 px-3 py-1.5 text-xs font-medium text-ink-500 transition-colors hover:border-ink-900/20 hover:text-ink-950"
      >
        <ArrowLeft size={14} strokeWidth={2} /> Tryby
      </button>

      {/* segmentowy przełącznik Lokalnie / Online */}
      <div className="flex items-center gap-1 rounded-full border border-ink-900/[0.06] bg-white/40 p-1">
        {MODES.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelectMode(id)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === id ? 'bg-ink-950 text-white' : 'text-ink-500 hover:text-ink-950'
            }`}
          >
            <Icon size={13} strokeWidth={1.8} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function DuelPage({ mode, onSelectMode, duels = [], onDuel }) {
  // Brak trybu → ekran wyboru.
  if (mode !== 'local' && mode !== 'online') {
    return <ModeSelect onSelect={onSelectMode} duels={duels} />
  }

  return (
    <div>
      <DuelTopBar mode={mode} onSelectMode={onSelectMode} />
      {/* -mt-2: lekko dociągamy arenę pod pasek (strony mają własny padding górny) */}
      <div className="-mt-2">
        {mode === 'local' ? <ArenaPage duels={duels} onDuel={onDuel} /> : <OnlineArenaPage />}
      </div>
    </div>
  )
}
