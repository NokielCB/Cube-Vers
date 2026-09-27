/**
 * Kontroler Solve — cienka warstwa "tłumacza" HTTP <-> domena.
 * Zadania: walidacja wejścia, wywołanie serwisu, kształt odpowiedzi.
 * Żadnej logiki bazodanowej ani liczenia statystyk tutaj nie ma.
 */
import {
  createSolve,
  getSolvesWithStats,
  deleteSolve,
  clearSolves,
  importSolves,
} from '../services/solve.service.js'
import { createSolveSchema } from '../validators/solve.schema.js'

// POST /api/solves
export async function postSolve(req, res, next) {
  try {
    const data = createSolveSchema.parse(req.body)
    const solve = await createSolve(req.userId, data)
    res.status(201).json(solve)
  } catch (err) {
    // Błędy walidacji Zod -> 400, resztę oddajemy globalnemu handlerowi.
    if (err?.name === 'ZodError') {
      return res.status(400).json({ error: 'Niepoprawne dane ułożenia.', issues: err.issues })
    }
    next(err)
  }
}

// GET /api/solves?take=100
export async function getSolves(req, res, next) {
  try {
    const take = Math.min(Number(req.query.take) || 100, 500)
    const result = await getSolvesWithStats(req.userId, { take })
    res.json(result) // { solves: [...], stats: { pb, ao5, ao12, trend, count } }
  } catch (err) {
    next(err)
  }
}

// DELETE /api/solves/:id
export async function removeSolve(req, res, next) {
  try {
    const { count } = await deleteSolve(req.userId, req.params.id)
    if (!count) return res.status(404).json({ error: 'Nie znaleziono ułożenia.' })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/solves/clear — kasuje CAŁĄ historię zalogowanego usera.
// userId pochodzi wyłącznie z tokenu (req.userId), nigdy z body/query —
// dzięki temu nie da się skasować cudzych danych podając obce id.
export async function clearAllSolves(req, res, next) {
  try {
    const { count } = await clearSolves(req.userId)
    res.json({ ok: true, cleared: count })
  } catch (err) {
    next(err)
  }
}

// POST /api/solves/import — migracja historii Gościa na konto.
export async function importGuestSolves(req, res, next) {
  try {
    const list = Array.isArray(req.body?.solves) ? req.body.solves : []
    if (list.length === 0) return res.json({ imported: 0 })
    if (list.length > 5000) return res.status(413).json({ error: 'Za dużo rekordów naraz.' })
    const { count } = await importSolves(req.userId, list)
    res.status(201).json({ imported: count })
  } catch (err) {
    next(err)
  }
}
