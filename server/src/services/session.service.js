/**
 * Warstwa serwisowa nazwanych sesji układania. Tak jak w solve.service:
 * każde zapytanie filtruje po `userId` z tokenu, więc cudzych sesji nie da się
 * ani odczytać, ani zmienić, ani usunąć.
 */
import { prisma } from '../lib/prisma.js'

// Limit sesji na konto — zwykły bezpiecznik przed zaśmiecaniem bazy.
export const MAX_SESSIONS = 50

const PUBLIC = { id: true, name: true, createdAt: true }

export function listSessions(userId) {
  return prisma.solveSession.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: PUBLIC,
  })
}

export async function createSession(userId, name) {
  const count = await prisma.solveSession.count({ where: { userId } })
  if (count >= MAX_SESSIONS) {
    const err = new Error(`Osiągnięto limit ${MAX_SESSIONS} sesji.`)
    err.status = 409
    throw err
  }
  return prisma.solveSession.create({ data: { userId, name }, select: PUBLIC })
}

/** Zmienia nazwę. null = nie ma takiej sesji u tego usera. */
export async function renameSession(userId, id, name) {
  const { count } = await prisma.solveSession.updateMany({ where: { id, userId }, data: { name } })
  if (!count) return null
  return prisma.solveSession.findUnique({ where: { id }, select: PUBLIC })
}

/**
 * Usuwa sesję. Jej czasy NIE znikają — klucz obcy z onDelete: SetNull
 * przenosi je do „Głównej" (sessionId = null) po stronie bazy.
 */
export function deleteSession(userId, id) {
  return prisma.solveSession.deleteMany({ where: { id, userId } })
}
