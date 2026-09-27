/** Kontroler analityki — cienki: woła serwis dla zalogowanego usera. */
import { getAnalyticsSummary } from '../services/analytics.service.js'

// GET /api/analytics/summary
export async function summary(req, res, next) {
  try {
    const data = await getAnalyticsSummary(req.userId)
    res.json(data)
  } catch (err) {
    next(err)
  }
}
