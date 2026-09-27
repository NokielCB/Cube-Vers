/**
 * Kontroler auth — cienka warstwa HTTP. Waliduje wejście, pilnuje limitów
 * prób, woła serwis, ustawia/kasuje httpOnly cookie i zwraca PUBLICZNY profil
 * (bez tokenu w body).
 */
import {
  registerUser,
  loginUser,
  getUserById,
  createSessionToken,
  verifySessionToken,
  revokeSession,
} from '../services/auth.service.js'
import { registerSchema, loginSchema } from '../validators/auth.schema.js'
import { COOKIE_NAME, cookieOptions } from '../lib/cookie.js'
import { loginByIp, loginByEmail, registerByIp } from '../lib/attemptLimiter.js'
import { tokenFrom } from '../middleware/auth.js'
import { disconnectSessions } from '../socket/presence.js'

async function issueSession(res, user) {
  const token = await createSessionToken(user.id)
  // Token ląduje w httpOnly cookie — front go nie widzi, przeglądarka
  // dołącza go automatycznie do kolejnych żądań.
  res.cookie(COOKIE_NAME, token, cookieOptions())
}

/** 429 z nagłówkiem Retry-After (ile sekund do odblokowania). */
function tooManyAttempts(res, seconds, what) {
  res.set('Retry-After', String(seconds))
  return res.status(429).json({
    error: `Za dużo prób ${what}. Spróbuj ponownie za ${Math.ceil(seconds / 60)} min.`,
  })
}

// POST /api/auth/register
export async function register(req, res, next) {
  const ipKey = req.ip
  const locked = registerByIp.secondsLocked(ipKey)
  if (locked) return tooManyAttempts(res, locked, 'rejestracji')
  registerByIp.hit(ipKey) // liczymy każdą próbę (także udaną)

  try {
    const data = registerSchema.parse(req.body)
    const user = await registerUser(data)
    await issueSession(res, user)
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
  const ipKey = req.ip
  const emailKey = String(req.body?.email ?? '').trim().toLowerCase()

  // Blokada sprawdzana PRZED bcryptem — zablokowany atakujący nie zużywa już CPU.
  const locked = Math.max(loginByIp.secondsLocked(ipKey), loginByEmail.secondsLocked(emailKey))
  if (locked) return tooManyAttempts(res, locked, 'logowania')

  try {
    const data = loginSchema.parse(req.body)
    const user = await loginUser(data)
    // Sukces zeruje licznik KONTA, ale nie IP — inaczej atakujący z własnym
    // kontem mógłby co kilka prób logować się na nie i zerować sobie limit.
    loginByEmail.reset(emailKey)
    await issueSession(res, user)
    res.json({ user })
  } catch (err) {
    if (err?.name === 'ZodError') {
      return res.status(400).json({ error: err.issues[0]?.message ?? 'Niepoprawne dane.' })
    }
    if (err?.status === 401) {
      loginByIp.hit(ipKey)
      if (emailKey) loginByEmail.hit(emailKey)
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

// POST /api/auth/logout — unieważnia sesję w bazie (token przestaje działać
// NAWET jeśli ktoś go skopiował) i kasuje ciasteczko (opcje MUSZĄ się zgadzać).
export async function logout(req, res, next) {
  try {
    const token = tokenFrom(req)
    const session = token ? await verifySessionToken(token) : null
    if (session) {
      await revokeSession(session.sessionId)
      void disconnectSessions(session.userId, [session.sessionId]).catch(() => {})
    }
    res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}
