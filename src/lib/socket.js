import { io } from 'socket.io-client'

/**
 * Singleton klienta Socket.io dla całej apki.
 *
 * KLUCZOWE decyzje:
 *  - `autoConnect: false` → socket NIE łączy się przy imporcie modułu. Łączymy
 *    ręcznie dopiero, gdy user wejdzie do Areny (socket.connect() w hooku), i
 *    rozłączamy przy wyjściu. Bez tego Vite HMR i każde wejście na stronę
 *    tworzyłyby wiszące połączenia.
 *  - Jedna instancja na moduł → wszystkie komponenty dzielą to samo połączenie,
 *    zamiast każdy otwierać własne.
 *
 * URL backendu z env (Vite): VITE_SOCKET_URL, fallback na lokalny serwer API.
 */
// undefined = ten sam adres co strona (produkcja z backendem wydającym frontend).
const URL = import.meta.env.VITE_SOCKET_URL ?? (import.meta.env.PROD ? undefined : 'http://localhost:4000')

export const socket = io(URL, {
  autoConnect: false,
  transports: ['websocket'], // pomijamy long-polling — od razu WebSocket
})

/**
 * KEEP-ALIVE — jedno połączenie na całą apkę, dwie strony chcą je „trzymać":
 *  • SocialContext (presence + wyzwania) — utrzymuje socket połączony przez CAŁY
 *    czas, gdy user jest zalogowany,
 *  • useDuelSocket (Arena) — łączy się na wejściu i normalnie rozłącza na wyjściu.
 *
 * Gdyby Arena bezwarunkowo rozłączała socket przy odmontowaniu, zabiłaby
 * presence. Dlatego SocialContext ustawia flagę keepAlive: Arena wtedy tylko
 * opuszcza pokój (leave_room), a NIE rozłącza wspólnego połączenia.
 */
let keepAlive = false

/** Włącz/wyłącz tryb keep-alive. Włączenie od razu łączy socket, jeśli trzeba. */
export function setKeepAlive(value) {
  keepAlive = value
  if (value && !socket.connected) socket.connect()
  if (!value && socket.connected) socket.disconnect()
}

/** Czy jakaś strona (SocialContext) chce trzymać połączenie stale otwarte? */
export function isKeepAlive() {
  return keepAlive
}
