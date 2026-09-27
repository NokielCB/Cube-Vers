/**
 * protectRoute — brama autoryzacji dla chronionych tras (dodawanie solve'ów,
 * pobieranie historii, /me itd.).
 *
 * Token JWT czytamy w dwóch miejscach, w kolejności:
 *   1. httpOnly cookie `cv_token` — nasza podstawowa, bezpieczna ścieżka,
 *   2. nagłówek `Authorization: Bearer <token>` — fallback np. dla klientów
 *      API/mobilnych, które nie używają ciasteczek.
 *
 * Token musi mieć poprawny podpis ORAZ żywą sesję w bazie (AuthSession) —
 * dzięki temu wylogowanie naprawdę go unieważnia.
 * Po sukcesie ustawia `req.userId` i `req.sessionId`.
 */
import { COOKIE_NAME } from '../lib/cookie.js'
import { verifySessionToken } from '../services/auth.service.js'

/** Token z ciasteczka albo nagłówka Authorization (null, gdy brak). */
export function tokenFrom(req) {
  const fromCookie = req.cookies?.[COOKIE_NAME]
  const [scheme, headerToken] = (req.headers.authorization ?? '').split(' ')
  return fromCookie ?? (scheme === 'Bearer' ? headerToken : null)
}

export async function protectRoute(req, res, next) {
  const token = tokenFrom(req)
  if (!token) {
    return res.status(401).json({ error: 'Wymagane logowanie.' })
  }

  try {
    const session = await verifySessionToken(token)
    if (!session) {
      return res.status(401).json({ error: 'Sesja wygasła — zaloguj się ponownie.' })
    }
    req.userId = session.userId
    req.sessionId = session.sessionId
    next()
  } catch (err) {
    next(err) // np. baza niedostępna → 500, a nie „zaloguj się ponownie"
  }
}

// Alias wstecznej kompatybilności — istniejące trasy używają requireAuth.
export const requireAuth = protectRoute
