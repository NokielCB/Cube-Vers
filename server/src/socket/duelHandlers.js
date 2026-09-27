/**
 * duelHandlers — rejestruje nasłuchiwacze eventów dla POJEDYNCZEGO połączenia.
 *
 * Zasada: wołane RAZ na `io.on('connection')`. Wszystkie listenery wiszą na
 * `socket` (nie na `io`), więc gdy klient się rozłącza, Socket.io sam je
 * sprząta — zero wycieków. Nie robimy `io.on(...)` w środku handlera połączenia
 * (to klasyczny błąd → n-krotne nasłuchiwanie tego samego eventu).
 */
import * as rooms from './roomManager.js'
import { generateScramble } from '../lib/scramble.js'
import { persistDuel } from '../services/duel.service.js'

export function registerDuelHandlers(io, socket) {
  // Kim jest gracz? W realu bierzemy z JWT w handshake (socket.data.userId).
  // Tu fallback na id socketu, żeby tryb działał także bez zalogowania.
  const userId = socket.data.userId ?? null
  const name = socket.data.name ?? 'Gracz'

  // ── join_room ────────────────────────────────────────────────────────────
  socket.on('join_room', (roomCode, ack) => {
    const code = String(roomCode || '').trim().toUpperCase()
    if (!code) return ack?.({ ok: false, error: 'Pusty kod pokoju.' })

    const res = rooms.addPlayer(code, { socketId: socket.id, userId, name })
    if (!res.ok) {
      // „duplicate" = ten socket JUŻ jest w pokoju (np. po remount/reconnect w
      // przepływie wyzwania) — traktujemy to jak sukces „jesteś już w pokoju",
      // a nie błąd, żeby klient nie wypadał do Lobby z komunikatem błędu.
      if (res.reason === 'duplicate') {
        const room = rooms.getRoom(code)
        return ack?.({ ok: true, roomCode: code, playerCount: room?.players.length ?? 1 })
      }
      return ack?.({ ok: false, error: 'Pokój jest pełny (max 2 graczy).' })
    }

    socket.join(code)
    socket.data.roomCode = code // zapamiętujemy do obsługi disconnect

    const playerCount = res.room.players.length
    ack?.({ ok: true, roomCode: code, playerCount })

    // Powiadom rywala, że ktoś dołączył; gdy jest komplet — obaj gotowi.
    socket.to(code).emit('opponent_joined', { name, playerCount })
    if (playerCount === 2) {
      io.to(code).emit('room_ready', { playerCount }) // można startować mecz
    }
  })

  // ── start_match ──────────────────────────────────────────────────────────
  socket.on('start_match', (ack) => {
    const code = socket.data.roomCode
    if (!code || !rooms.isFull(code)) {
      return ack?.({ ok: false, error: 'Potrzeba dwóch graczy w pokoju.' })
    }
    // SERWER generuje oficjalny scramble i rozsyła go OBAJ graczom naraz.
    const scramble = generateScramble()
    rooms.setScramble(code, scramble)
    io.to(code).emit('match_ready', { scramble, startedAt: Date.now() })
    ack?.({ ok: true })
  })

  // ── player_state_change ──────────────────────────────────────────────────
  // Odbieramy status gracza i NATYCHMIAST broadcastujemy go rywalowi.
  // socket.to(code) = wszyscy w pokoju OPRÓCZ nadawcy (czyli przeciwnik).
  socket.on('player_state_change', ({ state, time } = {}) => {
    const code = socket.data.roomCode
    if (!code) return
    socket.to(code).emit('opponent_state', { state, time: time ?? null })

    // Finisz z czasem → zapisz wynik i sprawdź, czy obaj skończyli.
    if (state === 'FINISHED' && typeof time === 'number') {
      const status = time < 0 ? 'DNF' : 'OK'
      const { room, bothFinished } = rooms.recordResult(code, socket.id, {
        time: Math.max(time, 0),
        status,
        userId,
      })
      if (bothFinished) void finalizeMatch(io, code, room)
    }
  })

  // ── leave_room ─────────────────────────────────────────────────────────────
  // Wyjście z Areny BEZ rozłączania socketu. Odkąd zalogowany socket żyje stale
  // (presence!), opuszczenie zakładki nie zrywa połączenia — więc pokój musimy
  // posprzątać jawnie tym eventem (a nie polegać wyłącznie na 'disconnect').
  socket.on('leave_room', () => {
    const code = socket.data.roomCode
    if (!code) return
    rooms.removePlayer(code, socket.id)
    socket.leave(code)
    socket.to(code).emit('opponent_left', { name })
    socket.data.roomCode = null
  })

  // ── disconnect ───────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const code = socket.data.roomCode
    if (!code) return
    rooms.removePlayer(code, socket.id)
    socket.to(code).emit('opponent_left', { name })
  })
}

/**
 * Domknięcie meczu: ustal werdykt, zapisz do bazy (jeśli gracze zalogowani),
 * rozešlij oficjalny wynik obu klientom.
 */
async function finalizeMatch(io, code, room) {
  const participants = room.players.map((p) => {
    const r = room.results.get(p.socketId) ?? { time: -1, status: 'DNF' }
    return { socketId: p.socketId, userId: p.userId, name: p.name, time: r.time, status: r.status }
  })

  // Werdykt liczony na serwerze — klient go tylko wyświetla.
  const contenders = participants.filter((p) => p.status !== 'DNF')
  const winner = contenders.length
    ? contenders.reduce((best, p) => (p.time < best.time ? p : best))
    : null

  let duelId = null
  // Zapis do bazy tylko, gdy OBAJ gracze są zalogowani (mamy userId).
  if (participants.every((p) => p.userId)) {
    try {
      const saved = await persistDuel({
        roomCode: code,
        scramble: room.scramble,
        participants,
      })
      duelId = saved.duelId
    } catch (err) {
      console.error('[DUEL] Zapis do bazy nie powiódł się:', err)
    }
  }

  io.to(code).emit('match_result', {
    duelId,
    scramble: room.scramble,
    winnerSocketId: winner?.socketId ?? null,
    results: participants.map(({ socketId, name, time, status }) => ({
      socketId,
      name,
      time,
      status,
    })),
  })
}
