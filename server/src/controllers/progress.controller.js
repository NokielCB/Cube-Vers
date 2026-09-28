/**
 * Kontroler postępu nauki algorytmów — statusy z Biblioteki, rekordy
 * z trybu treningu, notatki i „Ustaw jako główny". userId zawsze z tokenu (req.userId), nigdy z body.
 */
import {
  getProgress,
  importProgress,
  recordPb,
  setNote,
  setPrimary,
  setStatus,
} from '../services/progress.service.js'
import {
  importProgressSchema,
  noteBodySchema,
  pbBodySchema,
  primaryBodySchema,
  statusBodySchema,
  statusParamsSchema,
} from '../validators/progress.schema.js'

function zodError(res, err) {
  const tooMany = err.issues.some((i) => i.code === 'too_big' || /Za dużo/.test(i.message))
  return res.status(tooMany ? 413 : 400).json({ error: err.issues[0]?.message ?? 'Niepoprawne dane.' })
}

// GET /api/progress → { statuses, pbs, notes, primaryMoves }
export async function getAllProgress(req, res, next) {
  try {
    res.json(await getProgress(req.userId))
  } catch (err) {
    next(err)
  }
}

// PUT /api/progress/statuses/:algId  { status }
export async function putStatus(req, res, next) {
  try {
    const { algId } = statusParamsSchema.parse(req.params)
    const { status } = statusBodySchema.parse(req.body)
    res.json(await setStatus(req.userId, algId, status))
  } catch (err) {
    if (err?.name === 'ZodError') return zodError(res, err)
    next(err)
  }
}

// POST /api/progress/pbs  { algId, moves, time } → rekord obowiązujący po zapisie
export async function postPb(req, res, next) {
  try {
    const { algId, moves, time } = pbBodySchema.parse(req.body)
    res.json(await recordPb(req.userId, algId, moves, time))
  } catch (err) {
    if (err?.name === 'ZodError') return zodError(res, err)
    next(err)
  }
}

// PUT /api/progress/notes/:algId  { note } — cały tekst notatki ('' = usuń)
export async function putNote(req, res, next) {
  try {
    const { algId } = statusParamsSchema.parse(req.params)
    const { note } = noteBodySchema.parse(req.body)
    res.json(await setNote(req.userId, algId, note))
  } catch (err) {
    if (err?.name === 'ZodError') return zodError(res, err)
    next(err)
  }
}

// PUT /api/progress/primary/:algId  { moves } — „Ustaw jako główny"
export async function putPrimary(req, res, next) {
  try {
    const { algId } = statusParamsSchema.parse(req.params)
    const { moves } = primaryBodySchema.parse(req.body)
    res.json(await setPrimary(req.userId, algId, moves))
  } catch (err) {
    if (err?.name === 'ZodError') return zodError(res, err)
    next(err)
  }
}

// POST /api/progress/import  { statuses, pbs, notes, primaryMoves } — scalenie danych z localStorage.
export async function postImport(req, res, next) {
  try {
    const data = importProgressSchema.parse(req.body)
    res.status(201).json(await importProgress(req.userId, data))
  } catch (err) {
    if (err?.name === 'ZodError') return zodError(res, err)
    next(err)
  }
}
