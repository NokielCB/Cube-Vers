/**
 * roomManager — czysta, IZOLOWANA logika stanu pokojów pojedynków.
 *
 * Świadomie NIE importuje tu `io` ani niczego z Socket.io. To zwykły magazyn
 * stanu w pamięci procesu (Map), który można przetestować bez sieci.
 * Warstwa handlerów (duelHandlers.js) tłumaczy eventy socketu na te wywołania.
 *
 * Kształt pokoju:
 *   {
 *     code: string,
 *     players: [{ socketId, userId, name }],   // maks. 2
 *     scramble: string | null,
 *     results: Map<socketId, { time, status }>, // wyniki po finiszu
 *   }
 *
 * UWAGA o skalowaniu: Map w pamięci działa dla jednej instancji serwera.
 * Przy wielu instancjach (horizontal scaling) trzeba podmienić to na Redis
 * + @socket.io/redis-adapter. Interfejs zostaje ten sam — dlatego trzymamy
 * go w jednym module.
 */

const MAX_PLAYERS = 2
const rooms = new Map()

function getOrCreate(code) {
  let room = rooms.get(code)
  if (!room) {
    room = { code, players: [], scramble: null, results: new Map() }
    rooms.set(code, room)
  }
  return room
}

/**
 * Dodaje gracza do pokoju.
 * @returns {{ ok: true, room } | { ok: false, reason: 'full' | 'duplicate' }}
 */
export function addPlayer(code, player) {
  const room = getOrCreate(code)

  if (room.players.some((p) => p.socketId === player.socketId)) {
    return { ok: false, reason: 'duplicate' }
  }
  if (room.players.length >= MAX_PLAYERS) {
    return { ok: false, reason: 'full' }
  }

  room.players.push(player)
  return { ok: true, room }
}

/** Usuwa gracza (po socketId). Kasuje pusty pokój. Zwraca pokój lub null. */
export function removePlayer(code, socketId) {
  const room = rooms.get(code)
  if (!room) return null

  room.players = room.players.filter((p) => p.socketId !== socketId)
  room.results.delete(socketId)

  if (room.players.length === 0) {
    rooms.delete(code) // sprzątanie — inaczej Map rośnie w nieskończoność
    return null
  }
  return room
}

/** Zapisuje wynik gracza i mówi, czy OBAJ już skończyli. */
export function recordResult(code, socketId, result) {
  const room = rooms.get(code)
  if (!room) return { room: null, bothFinished: false }

  room.results.set(socketId, result)
  const bothFinished = room.players.length === MAX_PLAYERS && room.results.size === MAX_PLAYERS
  return { room, bothFinished }
}

export function getRoom(code) {
  return rooms.get(code) ?? null
}

export function isFull(code) {
  const room = rooms.get(code)
  return !!room && room.players.length >= MAX_PLAYERS
}

/** Ustawia scramble dla pokoju (po start_match). */
export function setScramble(code, scramble) {
  const room = rooms.get(code)
  if (room) {
    room.scramble = scramble
    room.results.clear() // nowy mecz = czyścimy stare wyniki
  }
  return room
}

export const __MAX_PLAYERS = MAX_PLAYERS // eksport pod testy
