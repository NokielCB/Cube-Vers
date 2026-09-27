/**
 * Kontroler Solve — cienka warstwa "tłumacza" HTTP <-> domena.
 * Zadania: walidacja wejścia, wywołanie serwisu, kształt odpowiedzi.
 * Żadnej logiki bazodanowej ani liczenia statystyk tutaj nie ma.
 */
import {
  createSolve,
  listSolves,
  updateSolve,
  deleteSolve,
  clearSolves,
  importSolves,
} from '../services/solve.service.js'
import {
  createSolveSchema,
  updateSolveSchema,
  listSolvesQuerySchema,
  importBodySchema,
  importSolveSchema,
} from '../validators/solve.schema.js'

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

// GET /api/solves?take=1000&cursor=<id> — jedna strona historii.
// Odpowiedź: { solves: [...], nextCursor: string|null } (null = to już koniec).
export async function getSolves(req, res, next) {
  try {
    const query = listSolvesQuerySchema.parse(req.query)
    res.json(await listSolves(req.userId, query))
  } catch (err) {
    if (err?.name === 'ZodError') {
      return res.status(400).json({ error: 'Niepoprawne parametry stronicowania.' })
    }
    next(err)
  }
}

// PATCH /api/solves/:id — kara (+2/DNF/OK) lub przeniesienie do innej sesji.
export async function patchSolve(req, res, next) {
  try {
    const data = updateSolveSchema.parse(req.body)
    const solve = await updateSolve(req.userId, req.params.id, data)
    if (!solve) return res.status(404).json({ error: 'Nie znaleziono ułożenia.' })
    res.json(solve)
  } catch (err) {
    if (err?.name === 'ZodError') {
      return res.status(400).json({ error: err.issues[0]?.message ?? 'Niepoprawne dane.' })
    }
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

// POST /api/solves/import — migracja historii (i sesji) Gościa na konto.
export async function importGuestSolves(req, res, next) {
  try {
    const { solves, sessions } = importBodySchema.parse(req.body)
    // Rekordy z localStorage mogą być zepsute — złe odrzucamy pojedynczo,
    // zamiast przez jeden śmieć odrzucać całą historię.
    const valid = solves
      .map((s) => importSolveSchema.safeParse(s))
      .filter((r) => r.success)
      .map((r) => r.data)
    if (valid.length === 0 && sessions.length === 0) return res.json({ imported: 0, sessions: 0 })
    const result = await importSolves(req.userId, valid, sessions)
    res.status(201).json(result)
  } catch (err) {
    if (err?.name === 'ZodError') {
      const tooMany = err.issues.some((i) => i.code === 'too_big')
      return res
        .status(tooMany ? 413 : 400)
        .json({ error: err.issues[0]?.message ?? 'Niepoprawne dane importu.' })
    }
    next(err)
  }
}
