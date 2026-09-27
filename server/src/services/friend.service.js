/**
 * Warstwa serwisowa systemu znajomych — JEDYNE miejsce rozmawiające z bazą
 * w kontekście relacji Friendship. Świadomie BEZ zależności od Socket.io:
 * logikę real-time (kto online, komu wysłać event) dokłada dopiero kontroler /
 * handlery. Dzięki temu serwis jest czysto testowalny.
 *
 * Publiczny kształt „innego" użytkownika — nigdy nie wypuszczamy e-maila ani
 * hasha, tylko to, co potrzebne do listy znajomych.
 */
import { prisma } from '../lib/prisma.js'

const publicSelect = { id: true, username: true, displayName: true }

function httpError(message, status) {
  const err = new Error(message)
  err.status = status
  return err
}

/**
 * Wysyła zaproszenie po nicku. Cała operacja siedzi w JEDNEJ transakcji, żeby
 * sprawdzenie „czy relacja już istnieje" i utworzenie rekordu były atomowe
 * (bez wyścigu, w którym dwa równoległe żądania tworzą duplikat). Dodatkowo
 * twardo chroni nas @@unique([senderId, receiverId]) w bazie.
 *
 * Smart-case: jeśli odbiorca WCZEŚNIEJ wysłał zaproszenie do nas (odwrotny
 * PENDING), nie tworzymy drugiego rekordu — od razu podnosimy tamten do
 * ACCEPTED (wzajemna chęć = znajomość).
 *
 * @returns {{ friendship, target, autoAccepted: boolean }}
 */
export async function sendFriendRequest(senderId, username) {
  // Nicki trzymamy małymi literami, więc szukamy po znormalizowanej wartości —
  // dzięki temu wyszukiwanie jest niewrażliwe na wielkość liter ("Alice" = "alice").
  const uname = String(username).trim().toLowerCase()
  const target = await prisma.user.findUnique({ where: { username: uname } })
  if (!target) throw httpError('Nie znaleziono użytkownika o tym nicku.', 404)
  if (target.id === senderId) throw httpError('Nie możesz dodać samego siebie.', 400)

  return prisma.$transaction(async (tx) => {
    const existing = await tx.friendship.findFirst({
      where: {
        OR: [
          { senderId, receiverId: target.id },
          { senderId: target.id, receiverId: senderId },
        ],
      },
    })

    if (existing) {
      if (existing.status === 'ACCEPTED') throw httpError('Już jesteście znajomymi.', 409)
      if (existing.senderId === senderId) throw httpError('Zaproszenie już wysłane.', 409)
      // Odwrotny PENDING → akceptujemy, stajemy się znajomymi od razu.
      const accepted = await tx.friendship.update({
        where: { id: existing.id },
        data: { status: 'ACCEPTED' },
      })
      return { friendship: accepted, target: pick(target), autoAccepted: true }
    }

    const created = await tx.friendship.create({
      data: { senderId, receiverId: target.id, status: 'PENDING' },
    })
    return { friendship: created, target: pick(target), autoAccepted: false }
  })
}

/**
 * Akceptuje (PENDING → ACCEPTED) lub odrzuca (kasuje rekord) zaproszenie.
 * Autoryzacja własności: reagować może TYLKO odbiorca (receiverId === userId).
 * @returns {{ friendship, accepted: boolean }}
 */
export async function respondFriendRequest(userId, requestId, accept) {
  const fr = await prisma.friendship.findUnique({ where: { id: requestId } })
  if (!fr || fr.receiverId !== userId || fr.status !== 'PENDING') {
    throw httpError('Nie znaleziono zaproszenia.', 404)
  }

  if (accept) {
    const updated = await prisma.friendship.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED' },
    })
    return { friendship: updated, accepted: true }
  }

  await prisma.friendship.delete({ where: { id: requestId } })
  return { friendship: fr, accepted: false }
}

/**
 * Pełny obraz relacji użytkownika, rozbity na trzy kubełki:
 *   friends   — zaakceptowani (obojętnie kto zapraszał),
 *   incoming  — PENDING, gdzie JA jestem odbiorcą (do akceptacji),
 *   outgoing  — PENDING, które JA wysłałem (informacyjnie).
 * Statusu online tu NIE liczymy — dokłada go kontroler z warstwy presence.
 */
export async function listFriends(userId) {
  const rows = await prisma.friendship.findMany({
    where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    include: { sender: { select: publicSelect }, receiver: { select: publicSelect } },
    orderBy: { createdAt: 'desc' },
  })

  const friends = []
  const incoming = []
  const outgoing = []

  for (const r of rows) {
    if (r.status === 'ACCEPTED') {
      const other = r.senderId === userId ? r.receiver : r.sender
      friends.push({ friendshipId: r.id, ...other })
    } else if (r.receiverId === userId) {
      incoming.push({ requestId: r.id, from: r.sender })
    } else {
      outgoing.push({ requestId: r.id, to: r.receiver })
    }
  }

  return { friends, incoming, outgoing }
}

/** Id wszystkich zaakceptowanych znajomych (do rozgłaszania presence). */
export async function getFriendIds(userId) {
  const rows = await prisma.friendship.findMany({
    where: { status: 'ACCEPTED', OR: [{ senderId: userId }, { receiverId: userId }] },
    select: { senderId: true, receiverId: true },
  })
  return rows.map((r) => (r.senderId === userId ? r.receiverId : r.senderId))
}

/** Czy dwaj użytkownicy są zaakceptowanymi znajomymi? (brama dla wyzwań). */
export async function areFriends(a, b) {
  const fr = await prisma.friendship.findFirst({
    where: {
      status: 'ACCEPTED',
      OR: [
        { senderId: a, receiverId: b },
        { senderId: b, receiverId: a },
      ],
    },
    select: { id: true },
  })
  return !!fr
}

function pick(user) {
  return { id: user.id, username: user.username, displayName: user.displayName }
}
