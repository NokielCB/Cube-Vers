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
 *
 * WDROŻENIE: „site" to domena główna, więc app.cubeverse.pl i api.cubeverse.pl
 * to TA SAMA witryna — 'lax' działa. Ale np. *.vercel.app i *.onrender.com to
 * RÓŻNE witryny (każda subdomena tych hostingów liczy się osobno) i przeglądarka
 * nie dołączy ciasteczka 'lax' do fetch() — logowanie „przejdzie", a /me zwróci
 * 401. Wtedy COOKIE_SAMESITE=none (wymusza Secure; CSRF łapie rejectForeignOrigin).
 * Uwaga: Safari i tak blokuje ciasteczka między witrynami — pewniejsza jest
 * własna domena z subdomeną api.
 */
export const COOKIE_NAME = 'cv_token'

export const SAME_SITE_VALUES = ['lax', 'strict', 'none']

export function cookieOptions() {
  const sameSite = SAME_SITE_VALUES.includes(process.env.COOKIE_SAMESITE) ? process.env.COOKIE_SAMESITE : 'lax'
  return {
    httpOnly: true,
    sameSite,
    // SameSite=None bez Secure przeglądarka odrzuca, więc wymuszamy Secure.
    secure: sameSite === 'none' || process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dni (spójne z TTL tokenu)
    path: '/',
  }
}
