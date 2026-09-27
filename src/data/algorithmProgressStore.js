/**
 * algorithmProgressStore — trwałość postępów nauki algorytmów w localStorage:
 *   - statusy nauki: { [algId]: 'new' | 'learning' | 'mastered' },
 *   - notatki:       { [algId]: "własny tekst użytkownika" }.
 *
 * Ten sam wzorzec co primaryMovesStore (klucz + load/save w try/catch). To stan
 * tej przeglądarki — trzyma się tak samo dla Gościa i zalogowanego.
 */
const STATUSES_KEY = 'cubeverse_alg_statuses'
const NOTES_KEY = 'cubeverse_alg_notes'

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
