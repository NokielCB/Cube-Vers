/**
 * presence — globalna mapa „kto jest online".
 *
 * Świadomie IZOLOWANY moduł stanu (jak roomManager): trzyma tylko powiązanie
 * userId → zbiór aktywnych socket.id. Zbiór, a nie pojedynczy id, bo jeden
 * użytkownik może mieć kilka kart/urządzeń naraz — online jest, dopóki został
 * mu choć jeden socket.
 *
 * Emisję do konkretnego użytkownika realizujemy przez „pokój per-user"
 * (`user:<id>`), do którego każdy socket sam dołącza po handshake. Dzięki temu
 * `io.to(userRoom(id)).emit(...)` trafia do wszystkich jego kart jednocześnie,
 * a my nie musimy ręcznie iterować po socket.id.
 */
import { getIO } from './index.js'

const online = new Map() // userId -> Set<socketId>

/** Nazwa prywatnego pokoju użytkownika (adresowanie eventów po userId). */
export const userRoom = (userId) => `user:${userId}`

/**
 * Rejestruje socket jako online.
 * @returns {{ wasOffline: boolean }} wasOffline=true, jeśli to PIERWSZY socket
 *          tego usera (czyli dopiero teraz „wskoczył" na online) — sygnał do
 *          rozgłoszenia zmiany statusu znajomym.
 */
export function addOnline(userId, socketId) {
  let set = online.get(userId)
  const wasOffline = !set || set.size === 0
  if (!set) {
    set = new Set()
    online.set(userId, set)
  }
  set.add(socketId)
  return { wasOffline }
}

/**
 * Wyrejestrowuje socket.
 * @returns {{ nowOffline: boolean }} nowOffline=true, jeśli to był OSTATNI socket
 *          tego usera (zeszedł offline).
 */
export function removeOnline(userId, socketId) {
  const set = online.get(userId)
  if (!set) return { nowOffline: false }
  set.delete(socketId)
  if (set.size === 0) {
    online.delete(userId)
    return { nowOffline: true }
  }
  return { nowOffline: false }
}

export function isOnline(userId) {
  const set = online.get(userId)
  return !!set && set.size > 0
}

/** Emituje event do WSZYSTKICH kart danego użytkownika (jeśli jest online). */
export function emitToUser(userId, event, payload) {
  if (!userId) return
  getIO().to(userRoom(userId)).emit(event, payload)
}

/**
 * Rozłącza sockety należące do unieważnionych sesji logowania (wylogowanie,
 * zmiana hasła). Tożsamość socketu ustala się raz, przy handshake'u — bez
 * tego raz połączony socket działałby dalej mimo unieważnionego tokenu.
 */
export async function disconnectSessions(userId, sessionIds) {
  if (!userId || !sessionIds?.length) return
  const revoked = new Set(sessionIds)
  const sockets = await getIO().in(userRoom(userId)).fetchSockets()
  for (const s of sockets) {
    if (revoked.has(s.data.sessionId)) s.disconnect(true)
  }
}
