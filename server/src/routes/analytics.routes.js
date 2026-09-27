/** Trasy analityki — chronione (wymagają zalogowania). */
import { Router } from 'express'
import { protectRoute } from '../middleware/auth.js'
import { summary } from '../controllers/analytics.controller.js'

const router = Router()

router.use(protectRoute)
router.get('/summary', summary) // GET /api/analytics/summary

export default router
