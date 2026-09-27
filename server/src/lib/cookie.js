/**
 * Wspólne opcje ciasteczka sesyjnego. Trzymamy je w JEDNYM miejscu, bo przy
 * czyszczeniu (logout) opcje MUSZĄ się zgadzać z tymi przy ustawianiu —
 * inaczej przeglądarka nie usunie ciasteczka.
 *
 *  httpOnly: true  → JavaScript w przeglądarce NIE ma dostępu do ciasteczka.
 *                    To kluczowa obrona przed kradzieżą tokenu przez XSS.
 *  sameSite:'lax'  → ciasteczko nie leci przy żądaniach cross-site (np. z
 *                    linku na obcej stronie), co ścina większość ataków CSRF.
 *  secure          → tylko po HTTPS (włączamy na produkcji).
 */
export const COOKIE_NAME = 'cv_token'

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dni (spójne z TTL tokenu)
    path: '/',
  }
}
