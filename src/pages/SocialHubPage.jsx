import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AtSign,
  Check,
  Clock,
  Loader2,
  Plus,
  Swords,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSocial } from '../context/SocialContext'

/**
 * SocialHubPage — „Social Hub": dodawanie po nicku, lista znajomych z presence
 * (online/offline) i wyzwaniami 1v1 oraz oczekujące zaproszenia. Styl spójny z
 * resztą apki: szkło (tile / bg-white), miękkie obramowania, Framer Motion.
 *
 * Cała logika (REST + socket) mieszka w SocialContext — tu tylko prezentacja
 * i drobny stan formularzy.
 */
export default function SocialHubPage() {
  const { isAuthenticated, user } = useAuth()
  const social = useSocial()

  // Social Hub wymaga konta (nick + relacje w chmurze). Gość dostaje zachętę.
  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-24 md:pt-10 lg:px-10">
        <Header username={null} />
        <div className="tile mt-8 flex flex-col items-center gap-3 p-14 text-center">
          <Users size={26} strokeWidth={1.4} className="text-ink-300" />
          <h2 className="text-lg font-semibold tracking-tight text-ink-900">
            Zaloguj się, aby korzystać z Social Hub
          </h2>
          <p className="max-w-sm text-sm text-ink-500">
            Znajomi, statusy online i wyzwania 1v1 są dostępne dla kont w chmurze.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-24 md:pt-10 lg:px-10">
      <Header username={social.username ?? user?.username} />

      <div className="mt-8 grid gap-4 lg:grid-cols-5">
        {/* lewa kolumna: dodawanie + oczekujące */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <AddFriendCard onAdd={social.sendRequest} />
          <PendingCard incoming={social.incoming} onRespond={social.respondRequest} />
        </div>

        {/* prawa kolumna: lista znajomych */}
        <div className="lg:col-span-3">
          <FriendsCard
            friends={social.friends}
            loading={social.loading}
            onChallenge={social.challenge}
          />
        </div>
      </div>
    </div>
  )
}

/* ─────────────── nagłówek ─────────────── */
function Header({ username }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 22 }}
    >
      <div className="flex items-center gap-2 text-ink-400">
        <Users size={16} strokeWidth={1.5} />
        <span className="text-[11px] font-medium uppercase tracking-[0.14em]">Social Hub</span>
      </div>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink-950 sm:text-5xl">
        Znajomi & wyzwania.
      </h1>
      <p className="mt-4 text-sm text-ink-500">
        {username ? (
          <>
            Twój nick:{' '}
            <span className="font-mono font-medium text-ink-900">@{username}</span> — podaj go
            znajomym, żeby Cię dodali.
          </>
        ) : (
          'Dodawaj graczy po nicku i wyzywaj ich na żywo.'
        )}
      </p>
    </motion.div>
  )
}

/* ─────────────── Sekcja 1: dodawanie po nicku ─────────────── */
function AddFriendCard({ onAdd }) {
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null) // {type:'ok'|'err', text}

  const submit = async (e) => {
    e.preventDefault()
    const nick = username.trim()
    if (!nick || busy) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await onAdd(nick)
      setUsername('')
      setMsg({
        type: 'ok',
        text: res?.autoAccepted ? 'Dodano do znajomych!' : 'Wysłano zaproszenie.',
      })
    } catch (err) {
      setMsg({ type: 'err', text: err.message ?? 'Nie udało się wysłać.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="tile p-6">
      <div className="flex items-center gap-2 text-ink-400">
        <UserPlus size={16} strokeWidth={1.5} />
        <span className="text-[11px] font-medium uppercase tracking-[0.14em]">Dodaj znajomego</span>
      </div>

      <form onSubmit={submit} className="mt-4 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-ink-900/[0.06] bg-white/60 px-3.5 py-2.5 transition-colors focus-within:border-ink-900/20">
          <AtSign size={15} strokeWidth={1.6} className="shrink-0 text-ink-400" />
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="nick gracza"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-full bg-transparent font-mono text-sm text-ink-900 placeholder:font-sans placeholder:text-ink-400 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !username.trim()}
          aria-label="Wyślij zaproszenie"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink-950 text-alabaster-50 transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy ? <Loader2 size={17} className="animate-spin" /> : <Plus size={18} strokeWidth={2} />}
        </button>
      </form>

      <AnimatePresence>
        {msg && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mt-3 text-xs font-medium ${
              msg.type === 'ok' ? 'text-emerald-600' : 'text-rose-500'
            }`}
          >
            {msg.text}
          </motion.p>
        )}
      </AnimatePresence>
    </section>
  )
}

/* ─────────────── Sekcja 3: oczekujące zaproszenia ─────────────── */
function PendingCard({ incoming, onRespond }) {
  const [busyId, setBusyId] = useState(null)

  const respond = async (requestId, accept) => {
    setBusyId(requestId)
    try {
      await onRespond(requestId, accept)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="tile p-6">
      <div className="flex items-center gap-2 text-ink-400">
        <Clock size={16} strokeWidth={1.5} />
        <span className="text-[11px] font-medium uppercase tracking-[0.14em]">
          Oczekujące zaproszenia
        </span>
        {incoming.length > 0 && (
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-ink-950 px-1.5 text-[11px] font-semibold text-alabaster-50">
            {incoming.length}
          </span>
        )}
      </div>

      {incoming.length === 0 ? (
        <p className="mt-4 text-sm text-ink-400">Brak nowych zaproszeń.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          <AnimatePresence initial={false}>
            {incoming.map((req) => (
              <motion.li
                key={req.requestId}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="flex items-center gap-3 rounded-2xl border border-ink-900/[0.06] bg-white/50 p-3"
              >
                <Avatar user={req.from} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-900">
                    {req.from.displayName || `@${req.from.username}`}
                  </p>
                  {req.from.displayName && (
                    <p className="truncate font-mono text-[11px] text-ink-400">@{req.from.username}</p>
                  )}
                </div>
                <button
                  onClick={() => respond(req.requestId, true)}
                  disabled={busyId === req.requestId}
                  aria-label="Akceptuj"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  {busyId === req.requestId ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={15} strokeWidth={2.2} />
                  )}
                </button>
                <button
                  onClick={() => respond(req.requestId, false)}
                  disabled={busyId === req.requestId}
                  aria-label="Odrzuć"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-900/[0.04] text-ink-400 transition-colors hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-50"
                >
                  <X size={15} strokeWidth={2.2} />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  )
}

/* ─────────────── Sekcja 2: lista znajomych (online / offline) ─────────────── */
function FriendsCard({ friends, loading, onChallenge }) {
  const online = friends.filter((f) => f.online)
  const offline = friends.filter((f) => !f.online)

  return (
    <section className="tile flex h-full flex-col p-6 lg:p-8">
      <div className="flex items-center gap-2 text-ink-400">
        <Users size={16} strokeWidth={1.5} />
        <span className="text-[11px] font-medium uppercase tracking-[0.14em]">Znajomi</span>
        <span className="ml-auto text-[11px] text-ink-400">
          {online.length} online · {friends.length} łącznie
        </span>
      </div>

      {loading && friends.length === 0 ? (
        <div className="mt-8 flex flex-1 items-center justify-center text-ink-300">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : friends.length === 0 ? (
        <div className="mt-8 flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <Users size={24} strokeWidth={1.4} className="text-ink-300" />
          <p className="text-sm font-medium text-ink-700">Twoja lista jest pusta</p>
          <p className="max-w-xs text-xs text-ink-400">
            Dodaj kogoś po nicku po lewej — gdy zaakceptuje, pojawi się tutaj.
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {online.length > 0 && (
            <FriendGroup title="Online" dotClass="bg-emerald-500" pulse>
              {online.map((f) => (
                <FriendRow key={f.id} friend={f} onChallenge={onChallenge} />
              ))}
            </FriendGroup>
          )}
          {offline.length > 0 && (
            <FriendGroup title="Offline" dotClass="bg-ink-300">
              {offline.map((f) => (
                <FriendRow key={f.id} friend={f} onChallenge={onChallenge} />
              ))}
            </FriendGroup>
          )}
        </div>
      )}
    </section>
  )
}

function FriendGroup({ title, dotClass, pulse = false, children }) {
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          {pulse && (
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${dotClass} opacity-60`} />
          )}
          <span className={`relative inline-flex h-2 w-2 rounded-full ${dotClass}`} />
        </span>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">{title}</h3>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

function FriendRow({ friend, onChallenge }) {
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const challenge = async () => {
    if (busy || sent) return
    setBusy(true)
    setErr(null)
    const ack = await onChallenge(friend.id)
    setBusy(false)
    if (ack?.ok) {
      // Wysłane — czekamy, aż rywal zaakceptuje (wtedy oba klienty zostaną
      // przekierowane do Areny przez pendingDuel). Reset po chwili.
      setSent(true)
      setTimeout(() => setSent(false), 8000)
    } else {
      setErr(ack?.error ?? 'Nie udało się wyzwać.')
      setTimeout(() => setErr(null), 3000)
    }
  }

  return (
    <div className="group flex items-center gap-3 rounded-2xl border border-ink-900/[0.05] bg-white/45 p-3 transition-colors hover:border-ink-900/10 hover:bg-white/70">
      <Avatar user={friend} online={friend.online} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink-900">
          {friend.displayName || `@${friend.username}`}
        </p>
        {friend.displayName && (
          <p className="truncate font-mono text-[11px] text-ink-400">@{friend.username}</p>
        )}
      </div>

      {err && <span className="text-[11px] font-medium text-rose-500">{err}</span>}

      {friend.online && !err && (
        <button
          onClick={challenge}
          disabled={busy || sent}
          title="Wyzwij na pojedynek"
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
            sent
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
              : 'border-ink-900/10 text-ink-500 hover:border-ink-900/25 hover:text-ink-950'
          }`}
        >
          {busy ? (
            <Loader2 size={13} className="animate-spin" />
          ) : sent ? (
            <>
              <Check size={13} strokeWidth={2.2} /> Wysłano
            </>
          ) : (
            <>
              <Swords size={13} strokeWidth={2} /> Challenge
            </>
          )}
        </button>
      )}
    </div>
  )
}

/* ─────────────── wspólny awatar (inicjał) ─────────────── */
function Avatar({ user, online }) {
  const letter = (user?.displayName || user?.username || '?').charAt(0).toUpperCase()
  return (
    <div className="relative">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-900/[0.06] text-sm font-semibold text-ink-700">
        {letter}
      </div>
      {online != null && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
            online ? 'bg-emerald-500' : 'bg-ink-300'
          }`}
        />
      )}
    </div>
  )
}
