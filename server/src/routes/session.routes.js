/** Trasy sesji układania — cały router chroniony JWT (protectRoute). */
import { Router } from 'express'
import { protectRoute } from '../middleware/auth.js'
import {
  getSessions,
  postSession,
  patchSession,
  removeSession,
} from '../controllers/session.controller.js'

const router = Router()

router.use(protectRoute)

router.get('/', getSessions) //          GET    /api/sessions
router.post('/', postSession) //         POST   /api/sessions
router.patch('/:id', patchSession) //    PATCH  /api/sessions/:id
router.delete('/:id', removeSession) //  DELETE /api/sessions/:id

export default router
