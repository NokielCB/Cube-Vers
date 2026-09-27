/**
 * Kontroler sesji układania — CRUD nazwanych sesji zalogowanego usera.
 * userId zawsze z tokenu (req.userId), nigdy z body.
 */
import {
  listSessions,
  createSession,
  renameSession,
  deleteSession,
} from '../services/session.service.js'
import { sessionNameSchema } from '../validators/session.schema.js'

function zodError(res, err) {
  return res.status(400).json({ error: err.issues[0]?.message ?? 'Niepoprawne dane.' })
}

// GET /api/sessions
export async function getSessions(req, res, next) {
  try {
    res.json({ sessions: await listSessions(req.userId) })
  } catch (err) {
    next(err)
  }
}

// POST /api/sessions  { name }
export async function postSession(req, res, next) {
  try {
    const { name } = sessionNameSchema.parse(req.body)
    res.status(201).json(await createSession(req.userId, name))
  } catch (err) {
    if (err?.name === 'ZodError') return zodError(res, err)
    next(err)
  }
}

// PATCH /api/sessions/:id  { name }
export async function patchSession(req, res, next) {
  try {
    const { name } = sessionNameSchema.parse(req.body)
    const session = await renameSession(req.userId, req.params.id, name)
    if (!session) return res.status(404).json({ error: 'Nie znaleziono sesji.' })
    res.json(session)
  } catch (err) {
    if (err?.name === 'ZodError') return zodError(res, err)
    next(err)
  }
}

// DELETE /api/sessions/:id — czasy sesji wracają do „Głównej" (SetNull w bazie).
export async function removeSession(req, res, next) {
  try {
    const { count } = await deleteSession(req.userId, req.params.id)
    if (!count) return res.status(404).json({ error: 'Nie znaleziono sesji.' })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}
