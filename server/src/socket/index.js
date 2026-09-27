/**
 * Singleton `io` — jedno źródło prawdy dla Socket.io w całym procesie.
 *
 * Trzymamy instancję w module-scoped zmiennej i eksportujemy:
 *   • initSocket(httpServer) — tworzy io RAZ i podpina handlery,
 *   • getIO() — daje dostęp z innych miejsc (np. z kontrolerów REST).
 *
 * Dlaczego singleton, a nie `new Server()` gdziekolwiek się chce:
 *   - drugi Server na tym samym HTTP serwerze = konflikt i podwójne eventy,
 *   - `io.on('connection')` rejestrujemy DOKŁADNIE raz — inaczej każdy restart
 *     modułu (HMR/import cyklu) dokładałby kolejny listener i handlery
 *     odpalałyby się n-krotnie. Guard `if (io) return io` temu zapobiega.
 */
import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { parse as parseCookie } from 'cookie'
import { registerDuelHandlers } from './duelHandlers.js'
import { registerFriendHandlers } from './friendHandlers.js'
import { COOKIE_NAME } from '../lib/cookie.js'
import { getUserById } from '../services/auth.service.js'

let io = null

export function initSocket(httpServer) {
  if (io) return io // GUARD: nie twórz drugi raz

  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN?.split(',') ?? 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true, // pozwól przeglądarce dosłać httpOnly cookie
    },
  })

  // Autoryzacja handshake: czytamy JWT z tego samego httpOnly cookie co REST.
  // Gość bez ważnego tokenu wciąż MOŻE grać (userId=null) — po prostu jego
  // mecze nie zapiszą się do bazy. Zaostrz to (next(new Error())), jeśli
  // chcesz wpuszczać wyłącznie zalogowanych.
  io.use(async (socket, next) => {
    try {
      const cookies = parseCookie(socket.handshake.headers.cookie ?? '')
      const token = cookies[COOKIE_NAME]
      if (token) {
        const payload = jwt.verify(token, process.env.JWT_SECRET)
        const user = await getUserById(payload.sub)
        if (user) {
          socket.data.userId = user.id
          socket.data.username = user.username ?? null
          socket.data.name = user.displayName ?? user.username ?? user.email
        }
      }
    } catch {
      // niepoprawny token → traktujemy jak gościa, nie blokujemy połączenia
    }
    next()
  })

  io.on('connection', (socket) => {
    console.log(`🔌 socket connected: ${socket.id}`)
    registerDuelHandlers(io, socket) //   pojedynki w Arenie (join_room, start_match…)
    registerFriendHandlers(io, socket) // presence + wyzwania znajomych
  })

  return io
}

export function getIO() {
  if (!io) throw new Error('Socket.io nie zostało zainicjalizowane — wywołaj initSocket() najpierw.')
  return io
}
