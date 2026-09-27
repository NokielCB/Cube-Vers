import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from './AuthContext'
import { socket, setKeepAlive } from '../lib/socket'

/**
 * SocialContext — mózg modułu „Friends & Real-Time Challenges".
 *
 * Odpowiada za:
 *  • utrzymanie WSPÓLNEGO socketu połączonego przez cały czas sesji (keep-alive)
 *    — to jest fundament presence: serwer wie, że jesteśmy online, dopóki żyje
 *    połączenie,
 *  • pobranie i odświeżanie listy znajomych / zaproszeń (REST),
 *  • nasłuch eventów real-time (presence, nowe zaproszenia, wyzwania) z pełnym
 *    cleanupem listenerów (socket.off z tą samą referencją),
 *  • wystawienie akcji (dodaj po nicku, odpowiedz na zaproszenie, wyzwij) oraz
 *    „sygnału nawigacji" pendingDuel, na który App przełącza widok do Areny.
 *
 * Cała logika socketowa siedzi TU (jedno miejsce), więc komponenty UI pozostają
 * czyste — konsumują stan i wołają akcje, nie dotykają socketu.
 */
const SocialContext = createContext(null)

const EMPTY = { username: null, friends: [], incoming: [], outgoing: [] }

export function SocialProvider({ children }) {
  const { isAuthenticated } = useAuth()

  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [invitation, setInvitation] = useState(null) // {fromUserId, fromUsername, fromName}
  const [pendingDuel, setPendingDuel] = useState(null) // {roomCode, autoStart}
  const [notice, setNotice] = useState(null) // {type, text} — ulotny toast

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.listFriends()
      setData({
        username: res.username ?? null,
        friends: res.friends ?? [],
        incoming: res.incoming ?? [],
        outgoing: res.outgoing ?? [],
      })
    } catch {
      setData(EMPTY)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── 1) Cykl życia połączenia: online tak długo, jak jesteśmy zalogowani ──
  useEffect(() => {
    if (!isAuthenticated) {
      setKeepAlive(false) // rozłącz → serwer rozgłosi nas jako offline
      setData(EMPTY)
      return
    }
    setKeepAlive(true) // połącz i TRZYMAJ (presence)
    refresh()
    return () => setKeepAlive(false)
  }, [isAuthenticated, refresh])

  // ── 2) Nasłuch eventów real-time (tylko gdy zalogowani) ──
  useEffect(() => {
    if (!isAuthenticated) return

    const onFriendRequest = ({ from }) => {
      const who = from?.displayName || (from?.username ? `@${from.username}` : 'Ktoś')
      setNotice({ type: 'request', text: `${who} chce Cię dodać do znajomych` })
      refresh()
    }
    const onFriendsChanged = () => refresh()
    // Presence patchujemy punktowo (bez pełnego refetchu) — płynniej.
    const onPresence = ({ userId, online }) =>
      setData((d) => ({
        ...d,
        friends: d.friends.map((f) => (f.id === userId ? { ...f, online } : f)),
      }))
    const onDuelInvitation = (payload) => setInvitation(payload)
    const onDuelDeclined = ({ byName }) =>
      setNotice({ type: 'declined', text: `${byName || 'Rywal'} odrzucił wyzwanie` })
    const onDuelStart = ({ roomCode, autoStart }) => {
      setInvitation(null)
      setPendingDuel({ roomCode, autoStart: !!autoStart })
    }
    const onDuelError = ({ error }) => setNotice({ type: 'error', text: error || 'Coś poszło nie tak.' })

    socket.on('friend_request', onFriendRequest)
    socket.on('friends_changed', onFriendsChanged)
    socket.on('friend_presence', onPresence)
    socket.on('duel_invitation', onDuelInvitation)
    socket.on('duel_declined', onDuelDeclined)
    socket.on('duel_start', onDuelStart)
    socket.on('duel_error', onDuelError)

    return () => {
      socket.off('friend_request', onFriendRequest)
      socket.off('friends_changed', onFriendsChanged)
      socket.off('friend_presence', onPresence)
      socket.off('duel_invitation', onDuelInvitation)
      socket.off('duel_declined', onDuelDeclined)
      socket.off('duel_start', onDuelStart)
      socket.off('duel_error', onDuelError)
    }
  }, [isAuthenticated, refresh])

  // Ulotny toast — auto-znika po 4 s (timer sprzątany przy zmianie/unmount).
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(t)
  }, [notice])

  // Zaproszenie do pojedynku само znika po 30 s, żeby modal nie wisiał w nieskończoność.
  useEffect(() => {
    if (!invitation) return
    const t = setTimeout(() => setInvitation(null), 30000)
    return () => clearTimeout(t)
  }, [invitation])

  // ── akcje ──
  const sendRequest = useCallback(
    async (username) => {
      const res = await api.requestFriend(username)
      await refresh()
      return res
    },
    [refresh],
  )

  const respondRequest = useCallback(
    async (requestId, accept) => {
      await api.respondFriend(requestId, accept)
      await refresh()
    },
    [refresh],
  )

  // Wyzwanie: emit z ack — serwer potwierdza (albo zwraca powód: offline itd.).
  const challenge = useCallback(
    (targetUserId) =>
      new Promise((resolve) => {
        socket.emit('send_duel_challenge', { targetUserId }, (ack) => resolve(ack ?? { ok: false }))
      }),
    [],
  )

  const respondInvitation = useCallback((accept) => {
    setInvitation((inv) => {
      if (inv) socket.emit('respond_duel_challenge', { fromUserId: inv.fromUserId, accept })
      return null
    })
  }, [])

  const consumePendingDuel = useCallback(() => setPendingDuel(null), [])
  const dismissNotice = useCallback(() => setNotice(null), [])

  const value = useMemo(
    () => ({
      ...data,
      loading,
      invitation,
      pendingDuel,
      notice,
      refresh,
      sendRequest,
      respondRequest,
      challenge,
      respondInvitation,
      consumePendingDuel,
      dismissNotice,
    }),
    [
      data,
      loading,
      invitation,
      pendingDuel,
      notice,
      refresh,
      sendRequest,
      respondRequest,
      challenge,
      respondInvitation,
      consumePendingDuel,
      dismissNotice,
    ],
  )

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>
}

export function useSocial() {
  const ctx = useContext(SocialContext)
  if (!ctx) throw new Error('useSocial musi być użyte wewnątrz <SocialProvider>.')
  return ctx
}
