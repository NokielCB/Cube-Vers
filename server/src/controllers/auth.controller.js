/**
 * Kontroler auth — cienka warstwa HTTP. Waliduje wejście, woła serwis,
 * ustawia/kasuje httpOnly cookie i zwraca PUBLICZNY profil (bez tokenu w body).
 */
import { registerUser, loginUser, getUserById, signToken } from '../services/auth.service.js'
import { registerSchema, loginSchema } from '../validators/auth.schema.js'
import { COOKIE_NAME, cookieOptions } from '../lib/cookie.js'

function issueSession(res, user) {
  const token = signToken(user.id)
  // Token ląduje w httpOnly cookie — front go nie widzi, przeglądarka
  // dołącza go automatycznie do kolejnych żądań.
  res.cookie(COOKIE_NAME, token, cookieOptions())
}

// POST /api/auth/register
export async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body)
    const user = await registerUser(data)
    issueSession(res, user)
    res.status(201).json({ user })
  } catch (err) {
    if (err?.name === 'ZodError') {
      return res.status(400).json({ error: err.issues[0]?.message ?? 'Niepoprawne dane.' })
    }
    next(err)
  }
}

// POST /api/auth/login
export async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body)
    const user = await loginUser(data)
    issueSession(res, user)
    res.json({ user })
  } catch (err) {
    if (err?.name === 'ZodError') {
      return res.status(400).json({ error: err.issues[0]?.message ?? 'Niepoprawne dane.' })
    }
    next(err)
  }
}

// GET /api/auth/me — odtworzenie sesji po odświeżeniu strony.
export async function me(req, res, next) {
  try {
    const user = await getUserById(req.userId)
    if (!user) return res.status(404).json({ error: 'Nie znaleziono użytkownika.' })
    res.json({ user })
  } catch (err) {
    next(err)
  }
}

// POST /api/auth/logout — kasuje ciasteczko (opcje MUSZĄ się zgadzać).
export async function logout(_req, res) {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined })
  res.json({ ok: true })
}
