/** Trasy autoryzacji. /me jest chronione — reszta publiczna. */
import { Router } from 'express'
import { register, login, me, logout } from '../controllers/auth.controller.js'
import { protectRoute } from '../middleware/auth.js'

const router = Router()

router.post('/register', register) // POST /api/auth/register
router.post('/login', login) //     POST /api/auth/login
router.post('/logout', logout) //   POST /api/auth/logout
router.get('/me', protectRoute, me) // GET /api/auth/me (wymaga sesji)

export default router
