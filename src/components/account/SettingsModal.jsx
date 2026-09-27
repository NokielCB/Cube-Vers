import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Check, Cloud, KeyRound, Loader2, LogOut, Trash2, User, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'

/**
 * SettingsModal — szklany modal ustawień (Framer Motion + rozmyte tło).
 * Trzy bento: Dane konta / Bezpieczeństwo / Akcje. Dla Gościa Bento 1 zachęca
 * do synchronizacji z chmurą, a formularz bezpieczeństwa jest wyłączony.
 */
export default function SettingsModal({ onClose }) {
  const { user, isGuest, logout, updateProfile, continueAsGuest } = useAuth()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      // Lekka, jasna zasłona spójna z głównym modalem (AlgorithmModal): 10% czerni
      // + mocniejszy blur zamiast dawnego 30% (przez które tło robiło się ciemne).
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/10 p-4 py-10 backdrop-blur-2xl"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 12 }}
        transition={{ type: 'spring', stiffness: 240, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg"
      >
        <div className="tile overflow-hidden p-6 sm:p-8">
          {/* nagłówek */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-ink-950">Ustawienia</h2>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-900/[0.05] hover:text-ink-700"
            >
              <X size={17} strokeWidth={1.8} />
            </button>
          </div>

          <div className="space-y-4">
            <AccountBento user={user} isGuest={isGuest} />
            <SecurityBento isGuest={isGuest} onSave={updateProfile} currentName={user?.displayName} />
            <DangerZoneBento isGuest={isGuest} />
            <ActionsBento isGuest={isGuest} onLogout={logout} onClose={onClose} onGuestSignup={continueAsGuest} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─────────────── Bento 1: dane konta ─────────────── */
function AccountBento({ user, isGuest }) {
  if (isGuest) {
    return (
      <div className="rounded-2xl border border-ink-900/[0.06] bg-white/50 p-5">
        <div className="flex items-center gap-2 text-ink-400">
          <Cloud size={15} strokeWidth={1.6} />
          <span className="text-[11px] font-medium uppercase tracking-[0.12em]">Tryb gościa</span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ink-600">
          Twoje ułożenia zapisują się <span className="font-medium text-ink-900">lokalnie w tej przeglądarce</span>.
          Załóż konto, aby zsynchronizować je z chmurą i mieć do nich dostęp z każdego urządzenia.
        </p>
      </div>
    )
  }

  const joined = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'

  return (
    <div className="rounded-2xl border border-ink-900/[0.06] bg-white/50 p-5">
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-400">
        Dane konta
      </span>
      <dl className="mt-3 space-y-2.5 text-sm">
        <Row label="E-mail" value={user?.email} />
        {user?.username && <Row label="Nick" value={`@${user.username}`} />}
        <Row label="Dołączono" value={joined} />
        <Row label="Status" value={<span className="text-emerald-600">Konto w chmurze · aktywne</span>} />
      </dl>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-ink-400">{label}</dt>
      <dd className="truncate font-medium text-ink-900">{value}</dd>
    </div>
  )
}

/* ─────────────── Bento 2: bezpieczeństwo ─────────────── */
function SecurityBento({ isGuest, onSave, currentName }) {
  const [name, setName] = useState(currentName ?? '')
  const [currentPassword, setCurrent] = useState('')
  const [newPassword, setNew] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null) // {type:'ok'|'err', text}

  if (isGuest) {
    return (
      <div className="rounded-2xl border border-ink-900/[0.06] bg-white/30 p-5 opacity-70">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-400">
          Bezpieczeństwo
        </span>
        <p className="mt-3 text-sm text-ink-500">
          Zmiana nazwy i hasła jest dostępna po założeniu konta.
        </p>
      </div>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    setMsg(null)
    const payload = {}
    if (name && name !== currentName) payload.displayName = name
    if (newPassword) {
      payload.currentPassword = currentPassword
      payload.newPassword = newPassword
    }
    if (Object.keys(payload).length === 0) {
      return setMsg({ type: 'err', text: 'Nic do zapisania.' })
    }
    setBusy(true)
    try {
      await onSave(payload)
      setMsg({ type: 'ok', text: 'Zapisano zmiany.' })
      setCurrent('')
      setNew('')
    } catch (err) {
      setMsg({ type: 'err', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-ink-900/[0.06] bg-white/50 p-5">
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-400">
        Bezpieczeństwo
      </span>

      <div className="mt-4 space-y-2.5">
        <MiniField icon={User} placeholder="Nazwa gracza" value={name} onChange={(e) => setName(e.target.value)} />
        <p className="px-1 text-[11px] leading-relaxed text-ink-400">
          Widoczna publiczna nazwa gracza — może się powtarzać. Nicku (@{'{'}nick{'}'}) nie zmienisz.
        </p>
        <div className="h-px bg-ink-900/[0.05]" />
        <MiniField icon={KeyRound} type="password" placeholder="Stare hasło" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} />
        <MiniField icon={KeyRound} type="password" placeholder="Nowe hasło (min. 8 znaków)" value={newPassword} onChange={(e) => setNew(e.target.value)} />
      </div>

      <AnimatePresence>
        {msg && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mt-3 text-xs font-medium ${msg.type === 'ok' ? 'text-emerald-600' : 'text-rose-500'}`}
          >
            {msg.text}
          </motion.p>
        )}
      </AnimatePresence>

      <button
        type="submit"
        disabled={busy}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-ink-950 px-4 py-2.5 text-sm font-medium text-alabaster-50 transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={2} />}
        Zapisz zmiany
      </button>
    </form>
  )
}

function MiniField({ icon: Icon, ...props }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-ink-900/[0.06] bg-white/60 px-3.5 py-2.5 transition-colors focus-within:border-ink-900/20">
      <Icon size={15} strokeWidth={1.6} className="shrink-0 text-ink-400" />
      <input {...props} className="w-full bg-transparent text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none" />
    </div>
  )
}

/* ─────────────── Bento: Danger Zone (Wipe All Solves) ─────────────── */
/**
 * DangerZoneBento — matowy burgund o niskim opacity. Sam przycisk NIE kasuje
 * niczego: otwiera minimalistyczny Confirmation Dialog, żeby zabezpieczyć przed
 * przypadkowym kliknięciem. `clearAll` z DataContext sam wybiera ścieżkę
 * (Gość → localStorage, Zalogowany → DELETE /api/solves/clear) i zeruje stan.
 */
function DangerZoneBento({ isGuest }) {
  const { clearAll, solves } = useData()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const count = solves.length

  const wipe = async () => {
    setBusy(true)
    setErr(null)
    try {
      await clearAll()
      setConfirming(false)
    } catch (e) {
      setErr(e.message ?? 'Nie udało się wyczyścić danych.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-[#5B1A22]/20 bg-[#5B1A22]/[0.05] p-5">
      <div className="flex items-center gap-2 text-[#8A2B33]">
        <AlertTriangle size={15} strokeWidth={1.8} />
        <span className="text-[11px] font-medium uppercase tracking-[0.12em]">Danger Zone</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-600">
        Trwałe usunięcie <span className="font-medium text-ink-900">całej historii ułożeń</span> i
        statystyk{' '}
        {isGuest ? 'z tej przeglądarki' : 'z Twojego konta w chmurze'}. Tej operacji nie można cofnąć.
      </p>

      <button
        onClick={() => setConfirming(true)}
        disabled={count === 0}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#5B1A22]/25 bg-[#5B1A22]/[0.06] px-4 py-2.5 text-sm font-medium text-[#8A2B33] transition-colors hover:bg-[#5B1A22]/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Trash2 size={15} strokeWidth={1.8} />
        {count === 0 ? 'Brak ułożeń do usunięcia' : `Wipe All Solves${count ? ` · ${count}` : ''}`}
      </button>

      <AnimatePresence>
        {confirming && (
          <WipeConfirmDialog
            isGuest={isGuest}
            count={count}
            busy={busy}
            err={err}
            onCancel={() => !busy && setConfirming(false)}
            onConfirm={wipe}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/** Confirmation Dialog — osobny szklany modal nad ustawieniami. */
function WipeConfirmDialog({ isGuest, count, busy, err, onCancel, onConfirm }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/40 p-4 backdrop-blur-xl"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="tile w-full max-w-sm p-6"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#5B1A22]/[0.08] text-[#8A2B33]">
          <AlertTriangle size={20} strokeWidth={1.8} />
        </div>
        <h3 className="mt-4 text-base font-semibold tracking-tight text-ink-950">
          Usunąć całą historię?
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          {count} {count === 1 ? 'ułożenie zostanie' : 'ułożeń zostanie'} bezpowrotnie usuniętych
          {isGuest ? ' z tej przeglądarki' : ' z Twojego konta'}. Statystyki wyzerują się od razu.
        </p>

        {err && <p className="mt-3 text-xs font-medium text-rose-500">{err}</p>}

        <div className="mt-6 flex gap-2.5">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-xl border border-ink-900/[0.08] bg-white/60 px-4 py-2.5 text-sm font-medium text-ink-600 transition-colors hover:bg-white/80 disabled:opacity-50"
          >
            Anuluj
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#5B1A22] px-4 py-2.5 text-sm font-medium text-alabaster-50 transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} strokeWidth={1.9} />}
            Usuń wszystko
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─────────────── Bento 3: akcje ─────────────── */
function ActionsBento({ isGuest, onLogout, onClose }) {
  const handle = async () => {
    await onLogout()
    onClose()
  }
  return (
    <div className="rounded-2xl border border-ink-900/[0.06] bg-white/50 p-5">
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-400">Akcje</span>
      <button
        onClick={handle}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/[0.04] px-4 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-500/[0.09]"
      >
        <LogOut size={15} strokeWidth={1.8} />
        {isGuest ? 'Zakończ tryb gościa' : 'Wyloguj się'}
      </button>
    </div>
  )
}
