/**
 * protectRoute — brama autoryzacji dla chronionych tras (dodawanie solve'ów,
 * pobieranie historii, /me itd.).
 *
 * Token JWT czytamy w dwóch miejscach, w kolejności:
 *   1. httpOnly cookie `cv_token` — nasza podstawowa, bezpieczna ścieżka,
 *   2. nagłówek `Authorization: Bearer <token>` — fallback np. dla klientów
 *      API/mobilnych, które nie używają ciasteczek.
 *
 * Po sukcesie ustawia `req.userId` (z pola `sub` tokenu).
 */
import jwt from 'jsonwebtoken'
import { COOKIE_NAME } from '../lib/cookie.js'

export function protectRoute(req, res, next) {
  const fromCookie = req.cookies?.[COOKIE_NAME]
  const [scheme, headerToken] = (req.headers.authorization ?? '').split(' ')
  const token = fromCookie ?? (scheme === 'Bearer' ? headerToken : null)

  if (!token) {
    return res.status(401).json({ error: 'Wymagane logowanie.' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = payload.sub
    next()
  } catch {
    return res.status(401).json({ error: 'Sesja wygasła — zaloguj się ponownie.' })
  }
}

// Alias wstecznej kompatybilności — istniejące trasy używają requireAuth.
export const requireAuth = protectRoute
