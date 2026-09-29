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
 *     scramble: string | null,                 // != null → mecz trwa albo się skończył
 *     results: Map<socketId, { time, status, userId }>, // OFICJALNE wyniki po finiszu
 *     solvingSince: Map<socketId, number>,     // kiedy SERWER dostał „SOLVING" gracza
 *   }
 *
 * UWAGA o skalowaniu: Map w pamięci działa dla jednej instancji serwera.
 * Przy wielu instancjach (horizontal scaling) trzeba podmienić to na Redis
 * + @socket.io/redis-adapter. Interfejs zostaje ten sam — dlatego trzymamy
 * go w jednym module.
 */

const MAX_PLAYERS = 2
const rooms = new Map()

// Czas mierzy stoper KLIENTA — serwer nie wie, kiedy palec puścił spację.
// Wie za to, kiedy dostał „SOLVING" i „FINISHED", więc zgłoszony czas nie może
// być DUŻO krótszy niż to, co sam zmierzył. Tolerancja pokrywa wahania sieci
// (drugi pakiet może dojść później niż pierwszy).
const NETWORK_TOLERANCE_MS = 1000
const MAX_TIME_MS = 60 * 60 * 1000 // godzina; powyżej = DNF (i nie przepełni Int w bazie)
const DNF = { time: 0, status: 'DNF' }

function getOrCreate(code) {
  let room = rooms.get(code)
  if (!room) {
    room = { code, players: [], scramble: null, results: new Map(), solvingSince: new Map() }
    rooms.set(code, room)
  }
  return room
}

/** Mecz ma scramble, a nie wszyscy jeszcze skończyli. */
function inProgress(room) {
  return !!room?.scramble && room.results.size < MAX_PLAYERS
}

/** Kasuje stan meczu (nowy mecz albo mecz unieważniony wyjściem gracza). */
function resetMatch(room, scramble = null) {
  room.scramble = scramble
  room.results.clear()
  room.solvingSince.clear()
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
  // Mecz bez jednego z graczy i tak nie dostanie werdyktu — unieważniamy go,
  // żeby po dołączeniu nowego rywala dało się wystartować od nowa.
  resetMatch(room)

  if (room.players.length === 0) {
    rooms.delete(code) // sprzątanie — inaczej Map rośnie w nieskończoność
    return null
  }
  return room
}

/** Serwer odnotowuje moment startu gracza — liczy się tylko PIERWSZY w meczu. */
export function markSolving(code, socketId, now) {
  const room = rooms.get(code)
  if (!inProgress(room) || room.results.has(socketId) || room.solvingSince.has(socketId)) return
  room.solvingSince.set(socketId, now)
}

/**
 * Oficjalny wynik z czasu zgłoszonego przez klienta (czysta funkcja).
 *  - brak liczby / liczba ujemna → DNF,
 *  - brak wcześniejszego „SOLVING" → DNF (uczciwy klient zawsze go wysyła),
 *  - czas krótszy niż zmierzony przez serwer (minus tolerancja) → czas serwera.
 */
export function judgeResult(reportedMs, solvingSince, now) {
  if (typeof reportedMs !== 'number' || !Number.isFinite(reportedMs) || reportedMs < 0) return DNF
  if (solvingSince == null) return DNF
  const measured = now - solvingSince
  const time = reportedMs < measured - NETWORK_TOLERANCE_MS ? measured : Math.round(reportedMs)
  return time > MAX_TIME_MS ? DNF : { time, status: 'OK' }
}

/**
 * Zapisuje wynik gracza i mówi, czy OBAJ już skończyli. Wynik przyjmujemy
 * tylko w trakcie meczu i tylko RAZ — drugi „FINISHED" z lepszym czasem
 * niczego nie nadpisze.
 *
 * @returns {{ accepted: false } | { accepted: true, result, room, bothFinished: boolean }}
 */
export function recordResult(code, socketId, { reportedMs, userId, now }) {
  const room = rooms.get(code)
  if (!inProgress(room) || room.results.has(socketId)) return { accepted: false }

  const result = { ...judgeResult(reportedMs, room.solvingSince.get(socketId), now), userId }
  room.results.set(socketId, result)
  const bothFinished = room.players.length === MAX_PLAYERS && room.results.size === MAX_PLAYERS
  return { accepted: true, result, room, bothFinished }
}

export function getRoom(code) {
  return rooms.get(code) ?? null
}

export function isFull(code) {
  const room = rooms.get(code)
  return !!room && room.players.length >= MAX_PLAYERS
}

export function isMatchInProgress(code) {
  return inProgress(rooms.get(code))
}

/** Ustawia scramble dla pokoju (po start_match) — nowy mecz = czyste wyniki. */
export function setScramble(code, scramble) {
  const room = rooms.get(code)
  if (room) resetMatch(room, scramble)
  return room
}

export const __MAX_PLAYERS = MAX_PLAYERS // eksport pod testy
