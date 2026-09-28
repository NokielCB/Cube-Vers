/** Trasy postępu nauki algorytmów — cały router chroniony JWT (protectRoute). */
import { Router } from 'express'
import { protectRoute } from '../middleware/auth.js'
import { getAllProgress, postImport, postPb, putStatus } from '../controllers/progress.controller.js'

const router = Router()

router.use(protectRoute)

router.get('/', getAllProgress) //               GET  /api/progress
router.put('/statuses/:algId', putStatus) //     PUT  /api/progress/statuses/:algId
router.post('/pbs', postPb) //                   POST /api/progress/pbs
router.post('/import', postImport) //            POST /api/progress/import (większy limit body — app.js)

export default router
