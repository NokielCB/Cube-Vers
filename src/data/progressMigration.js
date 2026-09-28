/**
 * Przeniesienie postępu nauki (statusy + rekordy z treningu) z localStorage
 * do chmury. Dwie okazje:
 *
 *  1) REJESTRACJA — dorobek Gościa trafia na nowe konto (jak jego czasy),
 *     patrz AuthContext.migrateGuestData → importLocalProgress().
 *
 *  2) JEDNORAZOWO po wdrożeniu chmury — wcześniej statusy i rekordy siedziały
 *     w localStorage dla WSZYSTKICH (także zalogowanych). Przy pierwszym
 *     wczytaniu postępu przez zalogowanego przenosimy je na jego konto
 *     (importLocalProgressOnce). Flaga pilnuje, żeby zrobić to raz na
 *     przeglądarkę — potem lokalne klucze należą już tylko do Gościa i
 *     zwykłe logowanie ich nie rusza (dokładnie tak jak z czasami Gościa).
 *
 * Scalanie po stronie serwera nie niszczy chmury: brakujące statusy są
 * dopisywane, a z dwóch rekordów zostaje lepszy. Dzięki temu powtórzony
 * import (np. po zerwanej sieci) jest bezpieczny.
 */
import { api } from '../lib/api'
import { clearProgress, loadPbs, loadStatuses } from './algorithmProgressStore'

const DONE_KEY = 'cubeverse_progress_in_cloud'

function isDone() {
  try {
    return localStorage.getItem(DONE_KEY) === '1'
  } catch {
    return false
  }
}

function markDone() {
  try {
    localStorage.setItem(DONE_KEY, '1')
  } catch {
    /* brak dostępu — w najgorszym razie spróbujemy ponownie (import jest bezpieczny) */
  }
}

/**
 * Wysyła lokalne statusy i rekordy na konto zalogowanego usera i czyści je
 * lokalnie. Lokalna kopia znika DOPIERO po sukcesie — przy błędzie nic nie ginie.
 * @returns {Promise<boolean>} true, jeśli było co przenieść
 */
export async function importLocalProgress() {
  const statuses = loadStatuses()
  const pbs = loadPbs()
  if (!Object.keys(statuses).length && !Object.keys(pbs).length) return false
  await api.importProgress({ statuses, pbs })
  clearProgress()
  return true
}

// Blokada przed równoległym uruchomieniem (np. podwójny efekt w StrictMode).
let running = null

/** Jednorazowa migracja starych danych tej przeglądarki (patrz punkt 2 wyżej). */
export function importLocalProgressOnce() {
  if (isDone()) return Promise.resolve(false)
  running ??= importLocalProgress()
    .then((changed) => {
      markDone()
      return changed
    })
    .finally(() => {
      running = null
    })
  return running
}
