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
import { guard, ackOf } from './safe.js'

const PLAYER_STATES = new Set(['IDLE', 'HOLDING', 'SOLVING', 'FINISHED'])
const ROOM_CODE = /^[A-Z0-9]{1,12}$/

export function registerDuelHandlers(io, socket) {
  // Kim jest gracz? W realu bierzemy z JWT w handshake (socket.data.userId).
  // Tu fallback na id socketu, żeby tryb działał także bez zalogowania.
  const userId = socket.data.userId ?? null
  const name = socket.data.name ?? 'Gracz'

  // ── join_room ────────────────────────────────────────────────────────────
  socket.on('join_room', guard('join_room', (roomCode, ack) => {
    const reply = ackOf(ack)
    const code = String(roomCode || '').trim().toUpperCase()
    if (!code) return reply({ ok: false, error: 'Pusty kod pokoju.' })
    if (!ROOM_CODE.test(code)) return reply({ ok: false, error: 'Niepoprawny kod pokoju.' })

    // Socket siedzi już w INNYM pokoju → najpierw z niego wychodzi. Inaczej
    // zostawałby tam „duch" gracza, a stary pokój nigdy nie zostałby sprzątnięty.
    const prev = socket.data.roomCode
    if (prev && prev !== code) leaveCurrentRoom()

    const res = rooms.addPlayer(code, { socketId: socket.id, userId, name })
    if (!res.ok) {
      // „duplicate" = ten socket JUŻ jest w pokoju (np. po remount/reconnect w
      // przepływie wyzwania) — traktujemy to jak sukces „jesteś już w pokoju",
      // a nie błąd, żeby klient nie wypadał do Lobby z komunikatem błędu.
      if (res.reason === 'duplicate') {
        const room = rooms.getRoom(code)
        return reply({ ok: true, roomCode: code, playerCount: room?.players.length ?? 1 })
      }
      return reply({ ok: false, error: 'Pokój jest pełny (max 2 graczy).' })
    }

    socket.join(code)
    socket.data.roomCode = code // zapamiętujemy do obsługi disconnect

    const playerCount = res.room.players.length
    reply({ ok: true, roomCode: code, playerCount })

    // Powiadom rywala, że ktoś dołączył; gdy jest komplet — obaj gotowi.
    socket.to(code).emit('opponent_joined', { name, playerCount })
    if (playerCount === 2) {
      io.to(code).emit('room_ready', { playerCount }) // można startować mecz
    }
  }))

  // ── start_match ──────────────────────────────────────────────────────────
  socket.on('start_match', guard('start_match', (ack) => {
    const reply = ackOf(ack)
    const code = socket.data.roomCode
    if (!code || !rooms.isFull(code)) {
      return reply({ ok: false, error: 'Potrzeba dwóch graczy w pokoju.' })
    }
    // Restart w trakcie meczu skasowałby wynik rywala — przegrywający mógłby
    // tak „unieważnić" każdą porażkę. Mecz już trwa → nic nie robimy, ale bez
    // błędu: tak kończy się też zwykłe „Rewanż" kliknięte przez obu naraz.
    if (rooms.isMatchInProgress(code)) {
      return reply({ ok: true, alreadyRunning: true })
    }
    // SERWER generuje oficjalny scramble i rozsyła go OBAJ graczom naraz.
    const scramble = generateScramble()
    rooms.setScramble(code, scramble)
    io.to(code).emit('match_ready', { scramble, startedAt: Date.now() })
    reply({ ok: true })
  }))

  // ── player_state_change ──────────────────────────────────────────────────
  // Odbieramy status gracza i NATYCHMIAST broadcastujemy go rywalowi.
  // socket.to(code) = wszyscy w pokoju OPRÓCZ nadawcy (czyli przeciwnik).
  socket.on('player_state_change', guard('player_state_change', (payload) => {
    const { state, time } = payload ?? {}
    const code = socket.data.roomCode
    if (!code || !PLAYER_STATES.has(state)) return

    if (state !== 'FINISHED') {
      if (state === 'SOLVING') rooms.markSolving(code, socket.id, Date.now())
      socket.to(code).emit('opponent_state', { state, time: null })
      return
    }

    // Finisz → serwer ustala OFICJALNY wynik (roomManager.judgeResult). Rywal
    // dostaje ten sam czas, który trafi do werdyktu, a nie surową liczbę z klienta.
    const res = rooms.recordResult(code, socket.id, { reportedMs: time, userId, now: Date.now() })
    if (!res.accepted) return // poza meczem albo drugi finisz tego samego gracza
    socket.to(code).emit('opponent_state', {
      state,
      time: res.result.status === 'DNF' ? null : res.result.time,
    })
    if (res.bothFinished) void finalizeMatch(io, code, res.room)
  }))

  // ── leave_room ─────────────────────────────────────────────────────────────
  // Wyjście z Areny BEZ rozłączania socketu. Odkąd zalogowany socket żyje stale
  // (presence!), opuszczenie zakładki nie zrywa połączenia — więc pokój musimy
  // posprzątać jawnie tym eventem (a nie polegać wyłącznie na 'disconnect').
  function leaveCurrentRoom() {
    const code = socket.data.roomCode
    if (!code) return
    rooms.removePlayer(code, socket.id)
    socket.leave(code)
    socket.to(code).emit('opponent_left', { name })
    socket.data.roomCode = null
  }

  socket.on('leave_room', guard('leave_room', leaveCurrentRoom))

  // ── disconnect ───────────────────────────────────────────────────────────
  socket.on('disconnect', guard('disconnect', () => {
    const code = socket.data.roomCode
    if (!code) return
    rooms.removePlayer(code, socket.id)
    socket.to(code).emit('opponent_left', { name })
  }))
}

/**
 * Domknięcie meczu: ustal werdykt, zapisz do bazy (jeśli gracze zalogowani),
 * rozešlij oficjalny wynik obu klientom.
 */
async function finalizeMatch(io, code, room) {
  // Kopia PRZED await — w trakcie zapisu gracz może wyjść albo odpalić rewanż,
  // a to czyści pola pokoju.
  const scramble = room.scramble
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
      const saved = await persistDuel({ roomCode: code, scramble, participants })
      duelId = saved.duelId
    } catch (err) {
      console.error('[DUEL] Zapis do bazy nie powiódł się:', err)
    }
  }

  io.to(code).emit('match_result', {
    duelId,
    scramble,
    winnerSocketId: winner?.socketId ?? null,
    results: participants.map(({ socketId, name, time, status }) => ({
      socketId,
      name,
      time,
      status,
    })),
  })
}
