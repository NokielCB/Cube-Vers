/**
 * Trasy Solve — mapują URL + metodę HTTP na kontroler.
 * Cały router jest chroniony protectRoute, więc dostęp bez sesji = 401.
 */
import { Router } from 'express'
import { protectRoute } from '../middleware/auth.js'
import {
  postSolve,
  getSolves,
  removeSolve,
  clearAllSolves,
  importGuestSolves,
} from '../controllers/solve.controller.js'

const router = Router()

router.use(protectRoute) // brama: wszystko poniżej wymaga zalogowania

router.get('/', getSolves) //         GET    /api/solves
router.post('/', postSolve) //        POST   /api/solves
router.post('/import', importGuestSolves) // POST /api/solves/import (migracja gościa)
router.delete('/clear', clearAllSolves) // DELETE /api/solves/clear (wyczyść całą historię)
router.delete('/:id', removeSolve) //  DELETE /api/solves/:id

// UWAGA: `/clear` MUSI być zadeklarowane PRZED `/:id`, inaczej Express
// dopasuje "clear" jako wartość parametru :id i nigdy nie trafi do clearAllSolves.

export default router
