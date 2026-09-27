/**
 * Prosty limiter prób w pamięci — obrona przed brute force na wrażliwych
 * akcjach (logowanie, rejestracja, zgadywanie „starego hasła" przy zmianie).
 *
 * createLimiter() tworzy niezależny licznik: po `max` zliczonych próbach
 * w oknie `windowMs` klucz jest blokowany na `lockMs`. Poprawna próba może
 * wyzerować licznik (reset).
 *
 * UWAGA produkcyjna: Map żyje w jednym procesie. Przy wielu instancjach
 * serwera podmień to na Redis (np. rate-limiter-flexible) — interfejs zostaje.
 */
const MIN = 60 * 1000
const SWEEP_EVERY = 10 * MIN

export function createLimiter({ max, windowMs, lockMs }) {
  const attempts = new Map() // key -> { count, firstAt, lockedUntil }

  // Sprzątanie wygasłych wpisów. Bez tego ktoś wysyłający próby z losowymi
  // e-mailami zapychałby pamięć serwera. unref() — timer nie trzyma procesu.
  const timer = setInterval(() => {
    const now = Date.now()
    for (const [key, a] of attempts) {
      if (a.lockedUntil <= now && now - a.firstAt > windowMs) attempts.delete(key)
    }
  }, SWEEP_EVERY)
  timer.unref?.()

  return {
    /** @returns {number} sekundy pozostałej blokady, albo 0 gdy odblokowane */
    secondsLocked(key) {
      const a = attempts.get(key)
      if (a?.lockedUntil && a.lockedUntil > Date.now()) {
        return Math.ceil((a.lockedUntil - Date.now()) / 1000)
      }
      return 0
    },

    /** Zlicza próbę; po przekroczeniu limitu zakłada blokadę. */
    hit(key) {
      const now = Date.now()
      let a = attempts.get(key)
      if (!a || now - a.firstAt > windowMs) a = { count: 0, firstAt: now, lockedUntil: 0 }
      a.count += 1
      if (a.count >= max) a.lockedUntil = now + lockMs
      attempts.set(key, a)
    },

    reset(key) {
      attempts.delete(key)
    },
  }
}

// ── Logowanie ────────────────────────────────────────────────────────────────
// Dwa klucze naraz, liczymy tylko NIEUDANE próby:
//  • IP — jeden atakujący nie zgadnie wielu haseł z jednego adresu,
//  • e-mail — rozproszony atak (wiele IP) na JEDNO konto też zostaje zatrzymany.
// Kompromis: ktoś może celowo zablokować cudze konto na 15 min, wpisując złe
// hasła. To standardowa cena ochrony konta przed zgadywaniem hasła.
export const loginByIp = createLimiter({ max: 20, windowMs: 15 * MIN, lockMs: 15 * MIN })
export const loginByEmail = createLimiter({ max: 10, windowMs: 15 * MIN, lockMs: 15 * MIN })

// ── Rejestracja ──────────────────────────────────────────────────────────────
// Liczymy KAŻDĄ próbę z danego IP (także udaną): hurtowe zakładanie kont
// i masowe sprawdzanie „czy ten e-mail jest zajęty" są wtedy mocno spowolnione.
export const registerByIp = createLimiter({ max: 10, windowMs: 60 * MIN, lockMs: 60 * MIN })

// ── Zmiana hasła (klucz: userId) — dotychczasowe API modułu ─────────────────
const passwordChange = createLimiter({ max: 5, windowMs: 15 * MIN, lockMs: 15 * MIN })
export const secondsLocked = (key) => passwordChange.secondsLocked(key)
export const registerFailure = (key) => passwordChange.hit(key)
export const resetAttempts = (key) => passwordChange.reset(key)
