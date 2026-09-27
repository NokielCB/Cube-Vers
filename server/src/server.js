/**
 * Punkt wejścia — uruchamia JEDEN serwer HTTP współdzielony przez
 * Express (REST) i Socket.io (WebSockets).
 *
 * Klucz: nie oddajemy portu bezpośrednio `app.listen()`. Tworzymy jawnie
 * http.Server z aplikacji Express, podpinamy do niego io i dopiero ten
 * serwer nasłuchuje. Dzięki temu REST i WebSocket żyją pod tym samym portem.
 */
import 'dotenv/config'
import http from 'node:http'
import { app } from './app.js'
import { initSocket } from './socket/index.js'

const PORT = process.env.PORT ?? 4000

const httpServer = http.createServer(app)
initSocket(httpServer) // io dzieli port z Express

httpServer.listen(PORT, () => {
  console.log(`🧊 CubeVerse API + WebSocket na http://localhost:${PORT}`)
})
