/**
 * Przeniesienie postępu nauki (statusy, rekordy z treningu, notatki, wybór
 * „Ustaw jako główny") z localStorage do chmury. Dwie okazje:
 *
 *  1) REJESTRACJA — dorobek Gościa trafia na nowe konto (jak jego czasy),
 *     patrz AuthContext.migrateGuestData → importLocalProgress().
 *
 *  2) JEDNORAZOWO po wdrożeniu chmury — wcześniej te dane siedziały
 *     w localStorage dla WSZYSTKICH (także zalogowanych). Przy pierwszym
 *     wczytaniu postępu przez zalogowanego przenosimy je na jego konto
 *     (importLocalProgressOnce). Flaga pilnuje, żeby zrobić to raz na
 *     przeglądarkę — potem lokalne klucze należą już tylko do Gościa i
 *     zwykłe logowanie ich nie rusza (dokładnie tak jak z czasami Gościa).
 *
 * Do chmury trafiało to etapami, więc flaga jest WERSJĄ migracji:
 *   1 — statusy i rekordy,
 *   2 — notatki i „Ustaw jako główny".
 * Przeglądarka z wersją 1 przenosi już tylko notatki i warianty. Statusów
 * i rekordów nie rusza, bo od wersji 1 lokalne należą do Gościa.
 *
 * Scalanie po stronie serwera nie niszczy chmury: brakujące wpisy są
 * dopisywane, a z dwóch rekordów zostaje lepszy. Dzięki temu powtórzony
 * import (np. po zerwanej sieci) jest bezpieczny.
 */
import { api } from '../lib/api'
import { clearProgress, loadLocalProgress } from './algorithmProgressStore'

const DONE_KEY = 'cubeverse_progress_in_cloud'

// Które części przenosi każda wersja migracji (patrz komentarz wyżej).
const MIGRATIONS = [
  { version: 1, parts: ['statuses', 'pbs'] },
  { version: 2, parts: ['notes', 'primaryMoves'] },
]
const LATEST = MIGRATIONS.at(-1).version
const ALL_PARTS = MIGRATIONS.flatMap((m) => m.parts)

function doneVersion() {
  try {
    return Number(localStorage.getItem(DONE_KEY)) || 0
  } catch {
    return 0
  }
}

function markDone() {
  try {
    localStorage.setItem(DONE_KEY, String(LATEST))
  } catch {
    /* brak dostępu — w najgorszym razie spróbujemy ponownie (import jest bezpieczny) */
  }
}

/**
 * Wysyła wskazane części lokalnego postępu na konto zalogowanego usera
 * i czyści je lokalnie. Lokalna kopia znika DOPIERO po sukcesie — przy
 * błędzie nic nie ginie.
 * @param {string[]} parts — np. ['notes', 'primaryMoves']; domyślnie wszystko
 * @returns {Promise<boolean>} true, jeśli było co przenieść
 */
export async function importLocalProgress(parts = ALL_PARTS) {
  const local = loadLocalProgress()
  const payload = Object.fromEntries(parts.map((part) => [part, local[part]]))
  if (Object.values(payload).every((map) => !Object.keys(map).length)) return false
  await api.importProgress(payload)
  clearProgress(parts)
  return true
}

// Blokada przed równoległym uruchomieniem (np. podwójny efekt w StrictMode).
let running = null

/** Jednorazowa migracja starych danych tej przeglądarki (patrz punkt 2 wyżej). */
export function importLocalProgressOnce() {
  const done = doneVersion()
  if (done >= LATEST) return Promise.resolve(false)
  const parts = MIGRATIONS.filter((m) => m.version > done).flatMap((m) => m.parts)
  running ??= importLocalProgress(parts)
    .then((changed) => {
      markDone()
      return changed
    })
    .finally(() => {
      running = null
    })
  return running
}
