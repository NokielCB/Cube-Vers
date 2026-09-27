/**
 * Kontroler profilu — PUT /api/user/update.
 * Spina walidację, limiter brute force i serwis aktualizacji.
 */
import { updateUser, revokeOtherSessions } from '../services/auth.service.js'
import { updateUserSchema } from '../validators/user.schema.js'
import { secondsLocked, registerFailure, resetAttempts } from '../lib/attemptLimiter.js'
import { disconnectSessions } from '../socket/presence.js'

export async function update(req, res, next) {
  // 1) Zablokowany po zbyt wielu pomyłkach starego hasła?
  const locked = secondsLocked(req.userId)
  if (locked) {
    return res.status(429).json({
      error: `Za dużo prób zmiany hasła. Spróbuj ponownie za ${Math.ceil(locked / 60)} min.`,
    })
  }

  try {
    const data = updateUserSchema.parse(req.body)
    const user = await updateUser(req.userId, data)
    resetAttempts(req.userId) // sukces → czyścimy licznik

    // Nowe hasło → wylogowujemy WSZYSTKIE inne urządzenia (jeśli ktoś przejął
    // sesję, właśnie ją traci). Bieżące urządzenie zostaje zalogowane.
    if (data.newPassword) {
      const revoked = await revokeOtherSessions(req.userId, req.sessionId)
      void disconnectSessions(req.userId, revoked).catch(() => {})
    }
    res.json({ user })
  } catch (err) {
    // Złe stare hasło = próba brute force → doliczamy do limitera.
    if (err?.code === 'BAD_OLD_PASSWORD') {
      registerFailure(req.userId)
      return res.status(401).json({ error: err.message })
    }
    if (err?.name === 'ZodError') {
      return res.status(400).json({ error: err.issues[0]?.message ?? 'Niepoprawne dane.' })
    }
    next(err)
  }
}
