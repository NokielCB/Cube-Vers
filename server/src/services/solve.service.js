/**
 * Warstwa serwisowa dla Solve — jedyne miejsce, które rozmawia z bazą
 * w kontekście ułożeń. Kontrolery NIE dotykają Prismy bezpośrednio.
 */
import { prisma } from '../lib/prisma.js'
import { buildStats } from './stats.service.js'

/** Dodaje nowy solve przypisany do zalogowanego użytkownika. */
export function createSolve(userId, { time, scramble, status }) {
  return prisma.solve.create({
    data: {
      userId,
      time,
      scramble,
      status: status ?? 'OK',
    },
  })
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
 * Masowy import solve'ów (migracja danych Gościa → konto). Jednym createMany
 * wrzucamy całą lokalną historię, przypisując ją do zalogowanego usera.
 */
export function importSolves(userId, list) {
  const valid = ['OK', 'PLUS2', 'DNF']
  const data = list
    .filter((s) => typeof s?.time === 'number' && s.time >= 0)
    .map((s) => ({
      userId,
      time: Math.round(s.time),
      scramble: typeof s.scramble === 'string' && s.scramble ? s.scramble.slice(0, 512) : 'imported',
      status: valid.includes(s.status) ? s.status : 'OK',
      createdAt: s.createdAt ? new Date(s.createdAt) : undefined,
    }))
  return prisma.solve.createMany({ data })
}

/**
 * Pobiera historię solve'ów usera (od najnowszego) i dolicza statystyki.
 * Zwraca { solves, stats } — gotowe do wysłania na front.
 */
export async function getSolvesWithStats(userId, { take = 100 } = {}) {
  const solves = await prisma.solve.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take, // paginacja: nie ciągniemy 10 000 rekordów na raz
  })

  return {
    solves,
    stats: buildStats(solves),
  }
}
