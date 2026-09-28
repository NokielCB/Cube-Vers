/**
 * algorithmProgressStore — postęp nauki algorytmów w localStorage:
 *   - statusy nauki:   { [algId]: 'new' | 'learning' | 'mastered' },
 *   - rekordy (PB):    { [algId]: { [sekwencja wariantu]: ms } } — z trybu treningu,
 *   - notatki:         { [algId]: "własny tekst użytkownika" },
 *   - wariant główny:  { [algId]: "R U R' U' ..." } — wybór „Ustaw jako główny".
 *
 * Rekord trzymamy per WARIANT (kluczem jest sekwencja ruchów), bo „Domyślny"
 * i np. „Lewa ręka (mirror)" to inne ruchy — ich czasów nie wolno porównywać.
 *
 * Kto z tego korzysta: TYLKO Gość (przez localRepo). Zalogowany trzyma całość
 * w chmurze (apiRepo); to, co zostało tu lokalnie, przenosi progressMigration.
 */
const KEYS = {
  statuses: 'cubeverse_alg_statuses',
  pbs: 'cubeverse_alg_pbs',
  notes: 'cubeverse_alg_notes',
  primaryMoves: 'cubeverse_primary_moves',
}

// Ten sam limit co na serwerze (progress.schema.js) — textarea go pilnuje.
export const MAX_NOTE_LENGTH = 2000

// Dozwolone statusy — StatusBadge w AlgorithmCard nie zna innych wartości
// i wywróciłby się na nieznanym statusie, więc śmieci odsiewamy przy wczytaniu.
const VALID_STATUSES = ['new', 'learning', 'mastered']

/**
 * Wczytuje mapę { algId: wartość }, zostawiając tylko wpisy, które przejdą
 * `isValid`. Każdy błąd (brak klucza / uszkodzony JSON) → pusty obiekt.
 */
function loadMap(key, isValid) {
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : {}
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(Object.entries(parsed).filter(([, v]) => isValid(v)))
  } catch {
    return {}
  }
}

function saveMap(key, map) {
  try {
    localStorage.setItem(key, JSON.stringify(map ?? {}))
  } catch {
    /* prywatny tryb / brak miejsca — ignorujemy, to nie jest stan krytyczny */
  }
}

export const loadStatuses = () => loadMap(KEYS.statuses, (v) => VALID_STATUSES.includes(v))
export const saveStatuses = (map) => saveMap(KEYS.statuses, map)

// Wpis rekordów jednego algorytmu: obiekt { sekwencja: ms }, same dodatnie liczby.
const isPbEntry = (v) =>
  !!v &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  Object.values(v).every((ms) => Number.isFinite(ms) && ms > 0)

export const loadPbs = () => loadMap(KEYS.pbs, isPbEntry)
export const savePbs = (map) => saveMap(KEYS.pbs, map)

// Pusta notatka to brak notatki — nie trzymamy (i nie importujemy) pustych wpisów.
export const loadNotes = () => loadMap(KEYS.notes, (v) => typeof v === 'string' && v.trim() !== '')
export const saveNotes = (map) => saveMap(KEYS.notes, map)

export const loadPrimaryMoves = () => loadMap(KEYS.primaryMoves, (v) => typeof v === 'string' && v !== '')
export const savePrimaryMoves = (map) => saveMap(KEYS.primaryMoves, map)

/** Wszystkie części postępu naraz — kształt taki jak z GET /api/progress. */
export function loadLocalProgress() {
  return {
    statuses: loadStatuses(),
    pbs: loadPbs(),
    notes: loadNotes(),
    primaryMoves: loadPrimaryMoves(),
  }
}

/**
 * Kasuje wskazane części lokalnego postępu — po udanym przeniesieniu ich do
 * chmury. `parts` to nazwy kluczy z KEYS (domyślnie wszystkie).
 */
export function clearProgress(parts = Object.keys(KEYS)) {
  try {
    for (const part of parts) localStorage.removeItem(KEYS[part])
  } catch {
    /* jw. */
  }
}
