/**
 * primaryMovesStore — trwałość wyboru „Ustaw jako główny" (mapa { algId: moves })
 * w localStorage. Ten sam wzorzec co localRepo.js (klucz + read/write/clear w
 * try/catch), tyle że dla preferencji klienta, nie historii ułożeń — dlatego
 * trzyma się tak samo dla Gościa i zalogowanego (to ustawienie tej przeglądarki).
 *
 * Kanoniczny kształt: { [algId]: "R U R' U' ..." } (sekwencja już bez wiodącej
 * rotacji — czyszczenie robi App przez splitOrientation przed zapisem).
 */
const KEY = 'cubeverse_primary_moves'

/** Wczytuje mapę nadpisań; każdy błąd (brak/JSON) → pusty obiekt. */
export function loadPrimaryMoves() {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/** Zapisuje całą mapę nadpisań (wołane przy każdej zmianie w App). */
export function savePrimaryMoves(map) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map ?? {}))
  } catch {
    /* prywatny tryb / brak miejsca — ignorujemy, preferencja nie jest krytyczna */
  }
}

/** Kasuje cały klucz — używane przez „Wipe All Solves" (clearAll w DataContext). */
export function clearPrimaryMoves() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* jw. */
  }
}
