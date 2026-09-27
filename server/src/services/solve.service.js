/**
 * Warstwa serwisowa dla Solve — jedyne miejsce, które rozmawia z bazą
 * w kontekście ułożeń. Kontrolery NIE dotykają Prismy bezpośrednio.
 *
 * Zasada bezpieczeństwa: KAŻDE zapytanie filtruje po `userId` z tokenu, a każde
 * `sessionId` od klienta sprawdzamy, czy należy do tego usera (assertOwnSession).
 * Bez tego dałoby się dopisać czas do cudzej sesji, podając jej id (IDOR).
 */
import { prisma } from '../lib/prisma.js'
import { MAX_SESSIONS } from './session.service.js'

function httpError(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

/** Rzuca 404, jeśli sesja nie istnieje LUB należy do kogoś innego. null = „Główna". */
async function assertOwnSession(userId, sessionId) {
  if (!sessionId) return
  const owned = await prisma.solveSession.count({ where: { id: sessionId, userId } })
  if (!owned) throw httpError(404, 'Nie znaleziono sesji.')
}

/** Dodaje nowy solve przypisany do zalogowanego użytkownika. */
export async function createSolve(userId, { time, scramble, status, sessionId }) {
  await assertOwnSession(userId, sessionId)
  return prisma.solve.create({
    data: {
      userId,
      time,
      scramble,
      status: status ?? 'OK',
      sessionId: sessionId ?? null,
    },
  })
}

/**
 * Zmienia karę (status) i/lub sesję pojedynczego solve'a. updateMany z
 * warunkiem userId = nie zmienisz cudzego rekordu. Zwraca świeży rekord
 * albo null, gdy nie ma takiego solve'a u tego usera.
 */
export async function updateSolve(userId, id, { status, sessionId }) {
  await assertOwnSession(userId, sessionId)
  const { count } = await prisma.solve.updateMany({
    where: { id, userId },
    data: { status, sessionId }, // undefined = pole bez zmian
  })
  if (!count) return null
  return prisma.solve.findUnique({ where: { id } })
}

/** Usuwa solve — deleteMany z warunkiem userId gwarantuje, że nie skasujesz
 *  cudzego rekordu (własność sprawdzona w zapytaniu, nie osobnym selectem). */
export function deleteSolve(userId, id) {
  return prisma.solve.deleteMany({ where: { id, userId } })
}

/**
 * Kasuje CAŁĄ historię ułożeń zalogowanego użytkownika. `deleteMany` z
 * warunkiem `userId` gwarantuje, że czyścimy wyłącznie rekordy właściciela
 * tokenu — nigdy cudze. Zwraca `{ count }` (liczba usuniętych).
 */
export function clearSolves(userId) {
  return prisma.solve.deleteMany({ where: { userId } })
}

/**
 * Import historii Gościa na konto (po rejestracji). W JEDNEJ transakcji:
 *   1) tworzymy sesje Gościa jako nowe rekordy i budujemy mapę
 *      lokalne id → id w bazie,
 *   2) wrzucamy czasy jednym createMany, podmieniając sessionId z mapy
 *      (nieznane lokalne id → „Główna").
 * Błąd w połowie = nic się nie zapisuje (brak „połówek" importu).
 *
 * @param {Array} solves   — już zwalidowane rekordy (importSolveSchema)
 * @param {Array} sessions — [{ id: lokalneId, name }]
 */
export function importSolves(userId, solves, sessions = []) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.solveSession.count({ where: { userId } })
    if (existing + sessions.length > MAX_SESSIONS) {
      throw httpError(409, `Za dużo sesji (limit: ${MAX_SESSIONS}).`)
    }

    const idMap = new Map()
    for (const s of sessions) {
      const created = await tx.solveSession.create({ data: { userId, name: s.name } })
      idMap.set(s.id, created.id)
    }

    const { count } = await tx.solve.createMany({
      data: solves.map((s) => ({
        userId,
        time: s.time,
        scramble: s.scramble,
        status: s.status,
        createdAt: s.createdAt,
        sessionId: idMap.get(s.sessionId) ?? null,
      })),
    })
    return { imported: count, sessions: idMap.size }
  })
}

/**
 * Jedna strona historii usera, od najnowszego. Stronicowanie kursorem:
 * klient podaje id ostatniego solve'a z poprzedniej strony i dostaje kolejną.
 * Pobieramy take + 1 rekordów — nadmiarowy mówi, czy jest następna strona.
 * Drugi klucz sortowania (id) rozstrzyga remisy przy identycznym createdAt.
 *
 * @returns {Promise<{ solves: object[], nextCursor: string|null }>}
 */
export async function listSolves(userId, { take, cursor }) {
  const rows = await prisma.solve.findMany({
    where: { userId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })
  const hasMore = rows.length > take
  const solves = hasMore ? rows.slice(0, take) : rows
  return { solves, nextCursor: hasMore ? solves[solves.length - 1].id : null }
}
