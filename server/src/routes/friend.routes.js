/**
 * Trasy systemu znajomych — cały router chroniony JWT (protectRoute).
 * Dostęp bez ważnej sesji = 401.
 */
import { Router } from 'express'
import { protectRoute } from '../middleware/auth.js'
import {
  postFriendRequest,
  getFriends,
  putFriendResponse,
} from '../controllers/friend.controller.js'

const router = Router()

router.use(protectRoute) // brama: wszystko poniżej wymaga zalogowania

router.post('/request', postFriendRequest) // POST /api/friends/request
router.get('/list', getFriends) //            GET  /api/friends/list
router.put('/respond', putFriendResponse) //  PUT  /api/friends/respond

export default router
