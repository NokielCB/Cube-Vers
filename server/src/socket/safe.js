/**
 * Siatka bezpieczeństwa dla handlerów Socket.io.
 *
 * Dane eventu przychodzą od KLIENTA — także od gościa bez konta — więc mogą
 * być czymkolwiek: null zamiast obiektu, liczba zamiast funkcji ack…
 * Wyjątek rzucony w listenerze Socket.io nie trafia do żadnego try/catch
 * (biblioteka woła listenery z process.nextTick), tylko wywraca CAŁY proces.
 * Przed tą poprawką jeden `socket.emit('player_state_change', null)` od gościa
 * kładł serwer wszystkim graczom.
 */

/** Owija handler: błąd (synchroniczny albo odrzucony Promise) → log zamiast upadku procesu. */
export function guard(event, handler) {
  const report = (err) => console.error(`[SOCKET] ${event}:`, err)
  return (...args) => {
    try {
      const out = handler(...args)
      if (out && typeof out.catch === 'function') out.catch(report)
    } catch (err) {
      report(err)
    }
  }
}

/** Ack od klienta — tylko jeśli to naprawdę funkcja (inaczej no-op). */
export const ackOf = (ack) => (typeof ack === 'function' ? ack : () => {})
