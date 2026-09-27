import { useCallback, useEffect, useRef, useState } from 'react'
import { socket, isKeepAlive } from '../lib/socket'

/**
 * useDuelSocket — cały cykl życia połączenia sieciowego pojedynku w jednym
 * miejscu. Komponent Areny konsumuje zwrócony stan i akcje; nie dotyka
 * socketu bezpośrednio.
 *
 * ──────────────── DLACZEGO TAK ZBUDOWANY useEffect ────────────────
 *
 * Jeden efekt na montowanie/odmontowanie (pusta tablica zależności [])
 * odpowiada za PARĘ: connect + subskrypcja listenerów ⇄ cleanup, który
 * zdejmuje DOKŁADNIE te same listenery i rozłącza socket.
 *
 *  1. Rejestrujemy handlery przez socket.on(...).
 *  2. socket.connect() — łączymy ręcznie (autoConnect:false).
 *  3. return () => { socket.off(...) dla każdego on(...); socket.disconnect() }
 *
 * Bez tego cleanupu, po wyjściu z zakładki Areny i powrocie, listenery
 * dokładałyby się warstwami (React w StrictMode montuje 2×, HMR jeszcze
 * częściej) → jeden event „opponent_state" odpalałby handler wielokrotnie.
 * `socket.off(event, handler)` z TĄ SAMĄ referencją funkcji to jedyny
 * pewny sposób ich zdjęcia — dlatego handlery są nazwane, nie inline.
 */
export function useDuelSocket() {
  // Socket może już BYĆ połączony (SocialContext trzyma keep-alive dla presence),
  // więc zdarzenie 'connect' mogło paść przed montowaniem hooka — inicjujemy
  // stan bieżącą wartością, zamiast czekać na kolejny 'connect'.
  const [connected, setConnected] = useState(socket.connected)
  const [roomCode, setRoomCode] = useState(null)
  const [playerCount, setPlayerCount] = useState(0)
  const [scramble, setScramble] = useState(null)
  const [opponent, setOpponent] = useState({ state: 'IDLE', time: null, name: null, present: false })
  const [result, setResult] = useState(null) // werdykt z serwera
  const [error, setError] = useState(null)

  // Zapamiętujemy własny socket.id, żeby odróżnić „siebie" w wyniku meczu.
  // Jeśli socket jest już połączony, id znamy od razu.
  const selfIdRef = useRef(socket.id ?? null)

  useEffect(() => {
    // — handlery (nazwane, by dało się je zdjąć w cleanupie) —
    const onConnect = () => {
      selfIdRef.current = socket.id
      setConnected(true)
    }
    const onDisconnect = () => setConnected(false)

    const onOpponentJoined = ({ name, playerCount }) => {
      setOpponent((o) => ({ ...o, name, present: true }))
      setPlayerCount(playerCount)
    }
    const onRoomReady = ({ playerCount }) => setPlayerCount(playerCount)

    const onMatchReady = ({ scramble }) => {
      setResult(null)
      setOpponent((o) => ({ ...o, state: 'IDLE', time: null }))
      setScramble(scramble)
    }

    const onOpponentState = ({ state, time }) =>
      setOpponent((o) => ({ ...o, state, time: time ?? o.time }))

    const onMatchResult = (payload) => setResult(payload)

    const onOpponentLeft = ({ name }) => {
      setOpponent({ state: 'IDLE', time: null, name, present: false })
      setPlayerCount(1)
    }

    // — subskrypcje —
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('opponent_joined', onOpponentJoined)
    socket.on('room_ready', onRoomReady)
    socket.on('match_ready', onMatchReady)
    socket.on('opponent_state', onOpponentState)
    socket.on('match_result', onMatchResult)
    socket.on('opponent_left', onOpponentLeft)

    // Łączymy ręcznie po wejściu do Areny. Idempotentne: jeśli SocialContext
    // już utrzymuje połączenie (keep-alive), connect() jest no-opem.
    if (!socket.connected) socket.connect()
    else {
      // socket już żył → 'connect' nie padnie; ustaw stan ręcznie.
      selfIdRef.current = socket.id
      setConnected(true)
    }

    // — CLEANUP: zdejmij te same handlery, opuść pokój, rozłącz TYLKO gdy nikt
    //   inny nie trzyma połączenia (gość bez keep-alive). Przy zalogowanym
    //   userze socket zostaje żywy dla presence — wychodzimy tylko z pokoju.
    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('opponent_joined', onOpponentJoined)
      socket.off('room_ready', onRoomReady)
      socket.off('match_ready', onMatchReady)
      socket.off('opponent_state', onOpponentState)
      socket.off('match_result', onMatchResult)
      socket.off('opponent_left', onOpponentLeft)
      socket.emit('leave_room')
      if (!isKeepAlive()) socket.disconnect()
    }
  }, [])

  // ── akcje wysyłane do serwera (z ack-callbackami) ──
  const joinRoom = useCallback((code) => {
    setError(null)
    socket.emit('join_room', code, (res) => {
      if (!res?.ok) return setError(res?.error ?? 'Nie udało się dołączyć.')
      setRoomCode(res.roomCode)
      setPlayerCount(res.playerCount)
    })
  }, [])

  const startMatch = useCallback(() => {
    socket.emit('start_match', (res) => {
      if (!res?.ok) setError(res?.error ?? 'Nie można wystartować.')
    })
  }, [])

  // Wyślij własny stan; serwer przekaże go rywalowi.
  const sendState = useCallback((state, time = null) => {
    socket.emit('player_state_change', { state, time })
  }, [])

  return {
    connected,
    roomCode,
    playerCount,
    scramble,
    opponent,
    result,
    error,
    selfId: selfIdRef.current,
    joinRoom,
    startMatch,
    sendState,
  }
}
