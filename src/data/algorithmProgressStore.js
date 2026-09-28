/**
 * algorithmProgressStore — trwałość postępów nauki algorytmów w localStorage:
 *   - statusy nauki: { [algId]: 'new' | 'learning' | 'mastered' },
 *   - notatki:       { [algId]: "własny tekst użytkownika" },
 *   - rekordy (PB):  { [algId]: { [sekwencja wariantu]: ms } } — z trybu treningu.
 *
 * Rekord trzymamy per WARIANT (kluczem jest sekwencja ruchów), bo „Domyślny"
 * i np. „Lewa ręka (mirror)" to inne ruchy — ich czasów nie wolno porównywać.
 *
 * Ten sam wzorzec co primaryMovesStore (klucz + load/save w try/catch).
 *
 * Kto z czego korzysta:
 *   - statusy i rekordy — TYLKO Gość (przez localRepo). Zalogowany trzyma je
 *     w chmurze (apiRepo); to, co zostało tu lokalnie, przenosi progressMigration,
 *   - notatki — stan tej przeglądarki, tak samo dla Gościa i zalogowanego.
 */
const STATUSES_KEY = 'cubeverse_alg_statuses'
const NOTES_KEY = 'cubeverse_alg_notes'
const PBS_KEY = 'cubeverse_alg_pbs'

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

export const loadStatuses = () => loadMap(STATUSES_KEY, (v) => VALID_STATUSES.includes(v))
export const saveStatuses = (map) => saveMap(STATUSES_KEY, map)

export const loadNotes = () => loadMap(NOTES_KEY, (v) => typeof v === 'string')
export const saveNotes = (map) => saveMap(NOTES_KEY, map)

// Wpis rekordów jednego algorytmu: obiekt { sekwencja: ms }, same dodatnie liczby.
const isPbEntry = (v) =>
  !!v &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  Object.values(v).every((ms) => Number.isFinite(ms) && ms > 0)

export const loadPbs = () => loadMap(PBS_KEY, isPbEntry)
export const savePbs = (map) => saveMap(PBS_KEY, map)

/** Kasuje lokalne statusy i rekordy — po udanym przeniesieniu ich do chmury. */
export function clearProgress() {
  try {
    localStorage.removeItem(STATUSES_KEY)
    localStorage.removeItem(PBS_KEY)
  } catch {
    /* jw. */
  }
}
