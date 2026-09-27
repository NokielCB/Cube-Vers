/**
 * Prosty limiter prób w pamięci — obrona przed brute force na wrażliwych
 * akcjach (np. zgadywanie „starego hasła" przy jego zmianie).
 *
 * Klucz to zwykle userId (akcja jest już za logowaniem). Po MAX nieudanych
 * próbach w oknie WINDOW blokujemy akcję na LOCK. Każda poprawna próba
 * resetuje licznik.
 *
 * UWAGA produkcyjna: Map żyje w jednym procesie. Przy wielu instancjach
 * serwera podmień to na Redis (np. rate-limiter-flexible) — interfejs zostaje.
 */
const attempts = new Map() // key -> { count, firstAt, lockedUntil }

const MAX = 5 // ile pomyłek zanim blokada
const WINDOW = 15 * 60 * 1000 // okno liczenia pomyłek (15 min)
const LOCK = 15 * 60 * 1000 // czas blokady po przekroczeniu (15 min)

/** @returns {number} sekundy pozostałej blokady, albo 0 gdy odblokowane */
export function secondsLocked(key) {
  const a = attempts.get(key)
  if (a?.lockedUntil && a.lockedUntil > Date.now()) {
    return Math.ceil((a.lockedUntil - Date.now()) / 1000)
  }
  return 0
}

export function registerFailure(key) {
  const now = Date.now()
  let a = attempts.get(key)
  if (!a || now - a.firstAt > WINDOW) a = { count: 0, firstAt: now, lockedUntil: 0 }
  a.count += 1
  if (a.count >= MAX) a.lockedUntil = now + LOCK
  attempts.set(key, a)
}

export function resetAttempts(key) {
  attempts.delete(key)
}
