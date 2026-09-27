/**
 * Kontroler systemu znajomych — cienka warstwa HTTP. Waliduje wejście, woła
 * serwis (czysta baza) i DOKŁADA warstwę real-time: status online (presence)
 * oraz powiadomienia przez socket (emitToUser). ID użytkownika bierzemy
 * WYŁĄCZNIE z tokenu (req.userId) — klient nie może podać cudzego.
 */
import {
  sendFriendRequest,
  respondFriendRequest,
  listFriends,
} from '../services/friend.service.js'
import { getOrCreateUsername, getUserById } from '../services/auth.service.js'
import { isOnline, emitToUser } from '../socket/presence.js'
import { requestFriendSchema, respondFriendSchema } from '../validators/friend.schema.js'

// POST /api/friends/request  { username }
export async function postFriendRequest(req, res, next) {
  try {
    const { username } = requestFriendSchema.parse(req.body)
    const { target, autoAccepted } = await sendFriendRequest(req.userId, username)
    const me = await getUserById(req.userId)

    if (autoAccepted) {
      // Staliśmy się znajomymi natychmiast — obie strony niech odświeżą listę.
      emitToUser(target.id, 'friends_changed', {})
    } else if (isOnline(target.id)) {
      // Odbiorca online → natychmiastowe powiadomienie + sygnał do odświeżenia listy.
      emitToUser(target.id, 'friend_request', {
        from: { id: me.id, username: me.username, displayName: me.displayName },
      })
      emitToUser(target.id, 'friends_changed', {})
    }

    res.status(201).json({ ok: true, autoAccepted })
  } catch (err) {
    if (err?.name === 'ZodError') {
      return res.status(400).json({ error: err.issues[0]?.message ?? 'Niepoprawne dane.' })
    }
    next(err)
  }
}

// GET /api/friends/list
export async function getFriends(req, res, next) {
  try {
    // Leniwy backfill nicka dla kont sprzed systemu znajomych.
    const username = await getOrCreateUsername(req.userId)
    const { friends, incoming, outgoing } = await listFriends(req.userId)

    res.json({
      username,
      // Status online dokładamy z presence dopiero tutaj (serwis go nie zna).
      friends: friends.map((f) => ({ ...f, online: isOnline(f.id) })),
      incoming,
      outgoing,
    })
  } catch (err) {
    next(err)
  }
}

// PUT /api/friends/respond  { requestId, accept }
export async function putFriendResponse(req, res, next) {
  try {
    const { requestId, accept } = respondFriendSchema.parse(req.body)
    const { friendship, accepted } = await respondFriendRequest(req.userId, requestId, accept)

    // Powiadom nadawcę zaproszenia (jeśli online), żeby jego lista się odświeżyła.
    emitToUser(friendship.senderId, 'friends_changed', {})

    res.json({ ok: true, accepted })
  } catch (err) {
    if (err?.name === 'ZodError') {
      return res.status(400).json({ error: err.issues[0]?.message ?? 'Niepoprawne dane.' })
    }
    next(err)
  }
}
