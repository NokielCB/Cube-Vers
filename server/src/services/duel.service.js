/**
 * Warstwa serwisowa pojedynków — zapis zakończonego meczu do bazy (Prisma).
 * Wywoływana z handlerów socketu, gdy obaj gracze skończyli.
 */
import { prisma } from '../lib/prisma.js'

/**
 * Trwale zapisuje pojedynek: tworzy Duel, dwa DuelPlayer i dwa Solve
 * (po jednym na gracza) — wszystko w JEDNEJ transakcji, żeby nie zostały
 * „połówki" meczu przy błędzie w środku.
 *
 * @param {{ roomCode:string, scramble:string, participants:Array<{userId:string,time:number,status?:string}> }} data
 * @returns {Promise<{ duelId:string, winnerId:string|null }>}
 */
export async function persistDuel({ roomCode, scramble, participants }) {
  // Zwycięzca = najniższy czas spośród graczy, którzy NIE zrobili DNF.
  const contenders = participants.filter((p) => p.status !== 'DNF')
  const winner = contenders.length
    ? contenders.reduce((best, p) => (p.time < best.time ? p : best))
    : null

  const duel = await prisma.$transaction(async (tx) => {
    const created = await tx.duel.create({
      data: {
        roomCode,
        scramble,
        winnerId: winner?.userId ?? null,
        players: {
          create: participants.map((p) => ({
            userId: p.userId,
            time: p.time,
            status: p.status ?? 'OK',
          })),
        },
        // dwa Solve przypięte do pojedynku — trafiają też do historii/statystyk gracza
        solves: {
          create: participants.map((p) => ({
            userId: p.userId,
            time: p.time,
            scramble,
            status: p.status ?? 'OK',
          })),
        },
      },
    })
    return created
  })

  return { duelId: duel.id, winnerId: duel.winnerId }
}
