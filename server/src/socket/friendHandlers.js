/**
 * friendHandlers — presence + wyzwania na żywo dla POJEDYNCZEGO połączenia.
 * Wołane RAZ z io.on('connection'), obok registerDuelHandlers. Wszystkie
 * listenery wiszą na `socket`, więc Socket.io sprząta je sam przy rozłączeniu.
 *
 * Zakres:
 *   • presence: dołącz do prywatnego pokoju usera, oznacz online/offline i
 *     rozgłoś zmianę statusu jego znajomym,
 *   • wyzwania: send_duel_challenge → duel_invitation → respond_duel_challenge
 *     → (accept) duel_start do OBU graczy z kodem pokoju.
 *
 * Gość (brak socket.data.userId) nie ma tożsamości, więc pomijamy — może grać
 * w Arenie (duelHandlers), ale nie uczestniczy w presence ani wyzwaniach.
 */
import {
  addOnline,
  removeOnline,
  isOnline,
  emitToUser,
  userRoom,
} from './presence.js'
import { areFriends, getFriendIds } from '../services/friend.service.js'

/** Krótki, czytelny kod pokoju (A–Z, 2–9; bez mylących 0/O/1/I). */
function genRoomCode(len = 6) {
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < len; i++) code += ALPHABET[(Math.random() * ALPHABET.length) | 0]
  return code
}

/** Rozgłasza zmianę statusu online danego usera wszystkim jego znajomym. */
async function broadcastPresence(userId, online) {
  try {
    const friendIds = await getFriendIds(userId)
    for (const fid of friendIds) emitToUser(fid, 'friend_presence', { userId, online })
  } catch (err) {
    console.error('[PRESENCE] broadcast nie powiódł się:', err)
  }
}

export function registerFriendHandlers(io, socket) {
  const userId = socket.data.userId
  if (!userId) return // gość — brak presence/wyzwań

  // ── presence: online ───────────────────────────────────────────────────────
  socket.join(userRoom(userId)) // prywatny pokój do adresowania eventów po userId
  const { wasOffline } = addOnline(userId, socket.id)
  if (wasOffline) void broadcastPresence(userId, true)

  // ── send_duel_challenge ─────────────────────────────────────────────────────
  // Gracz A wyzywa znajomego. Walidujemy: cel to znajomy (ACCEPTED) i jest online.
  socket.on('send_duel_challenge', async ({ targetUserId } = {}, ack) => {
    try {
      if (!targetUserId || targetUserId === userId) {
        return ack?.({ ok: false, error: 'Nieprawidłowy cel wyzwania.' })
      }
      if (!(await areFriends(userId, targetUserId))) {
        return ack?.({ ok: false, error: 'To nie jest Twój znajomy.' })
      }
      if (!isOnline(targetUserId)) {
        return ack?.({ ok: false, error: 'Ten gracz jest teraz offline.' })
      }
      emitToUser(targetUserId, 'duel_invitation', {
        fromUserId: userId,
        fromUsername: socket.data.username ?? null,
        fromName: socket.data.name ?? 'Gracz',
      })
      ack?.({ ok: true })
    } catch (err) {
      console.error('[DUEL] send_duel_challenge:', err)
      ack?.({ ok: false, error: 'Nie udało się wysłać wyzwania.' })
    }
  })

  // ── respond_duel_challenge ──────────────────────────────────────────────────
  // Gracz B odpowiada. Accept → serwer tworzy pokój i wypycha OBU graczom
  // `duel_start` (inicjator z autoStart=true, by po wejściu obu odpalić mecz).
  socket.on('respond_duel_challenge', async ({ fromUserId, accept } = {}) => {
    try {
      if (!fromUserId || fromUserId === userId) return

      if (!accept) {
        return emitToUser(fromUserId, 'duel_declined', {
          byUserId: userId,
          byName: socket.data.name ?? 'Gracz',
        })
      }

      // Zabezpieczenie: nadal znajomi i wyzywający wciąż online.
      if (!(await areFriends(userId, fromUserId)) || !isOnline(fromUserId)) {
        return emitToUser(userId, 'duel_error', { error: 'Wyzwanie wygasło.' })
      }

      const roomCode = genRoomCode()
      emitToUser(fromUserId, 'duel_start', { roomCode, autoStart: true })
      emitToUser(userId, 'duel_start', { roomCode, autoStart: false })
    } catch (err) {
      console.error('[DUEL] respond_duel_challenge:', err)
    }
  })

  // ── presence: offline (ostatni socket usera) ────────────────────────────────
  socket.on('disconnect', () => {
    const { nowOffline } = removeOnline(userId, socket.id)
    if (nowOffline) void broadcastPresence(userId, false)
  })
}
