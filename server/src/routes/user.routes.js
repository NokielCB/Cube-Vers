/** Trasy profilu użytkownika — chronione. */
import { Router } from 'express'
import { protectRoute } from '../middleware/auth.js'
import { update } from '../controllers/user.controller.js'

const router = Router()

router.use(protectRoute)
router.put('/update', update) // PUT /api/user/update

export default router
