import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, AtSign, Box, Loader2, Lock, Mail } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

/**
 * AuthScreen — centralny, luksusowy bento-box logowania i rejestracji.
 *
 * Estetyka: głęboka czerń (ink-950), matowe szkło, biała typografia Inter,
 * subtelny organiczny blask w tle. Jeden komponent obsługuje oba tryby
 * (login / rejestracja), przełączane płynnie przez AnimatePresence.
 */
export default function AuthScreen() {
  const { login, register, continueAsGuest } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [form, setForm] = useState({ email: '', password: '', username: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const isLogin = mode === 'login'
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (isLogin) {
        await login({ email: form.email, password: form.password })
      } else {
        await register({
          email: form.email,
          password: form.password,
          username: form.username.trim(),
        })
      }
      // sukces → AuthProvider ustawi user, App przełączy widok
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const toggle = () => {
    setMode(isLogin ? 'register' : 'login')
    setError(null)
  }

  return (
    <div className="bg-organic relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      {/* subtelny blask za kartą */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink-950/[0.04] blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 22 }}
        className="tile-dark relative w-full max-w-md overflow-hidden p-8 sm:p-10"
      >
        {/* logo + nagłówek */}
        <div className="flex items-center gap-2.5 text-alabaster-50/60">
          <Box size={22} strokeWidth={1.25} className="text-alabaster-50" />
          <span className="text-[11px] font-medium uppercase tracking-[0.16em]">CubeVerse</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <h1 className="mt-8 text-3xl font-semibold tracking-tight text-alabaster-50">
              {isLogin ? 'Witaj ponownie.' : 'Dołącz do CubeVerse.'}
            </h1>
            <p className="mt-2 text-sm text-alabaster-50/50">
              {isLogin
                ? 'Zaloguj się, aby wrócić do swoich statystyk i pojedynków.'
                : 'Załóż konto i zacznij budować swoją historię ułożeń.'}
            </p>
          </motion.div>
        </AnimatePresence>

        <form onSubmit={submit} className="mt-8 space-y-3">
          {/* nick tylko przy rejestracji — unikalny, po nim znajdą Cię znajomi */}
          <AnimatePresence initial={false}>
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Field
                  icon={AtSign}
                  type="text"
                  placeholder="Nick — po nim znajdą Cię znajomi"
                  value={form.username}
                  onChange={set('username')}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  minLength={3}
                  maxLength={20}
                  required
                />
                <p className="mt-1.5 px-1 text-[11px] leading-relaxed text-alabaster-50/35">
                  Unikalny i stały. Tylko litery, cyfry i „_" (3–20 znaków). Nazwę
                  gracza ustawisz później w ustawieniach.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <Field
            icon={Mail}
            type="email"
            placeholder="E-mail"
            value={form.email}
            onChange={set('email')}
            required
          />
          <Field
            icon={Lock}
            type="password"
            placeholder="Hasło"
            value={form.password}
            onChange={set('password')}
            required
          />

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="pt-1 text-center text-xs font-medium text-rose-400"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={busy}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-alabaster-50 px-5 py-3.5 text-sm font-semibold text-ink-950 transition-opacity duration-200 hover:opacity-90 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                {isLogin ? 'Zaloguj się' : 'Utwórz konto'}
                <ArrowRight size={16} strokeWidth={2} />
              </>
            )}
          </button>
        </form>

        {/* przełącznik trybu */}
        <p className="mt-6 text-center text-sm text-alabaster-50/50">
          {isLogin ? 'Nie masz jeszcze konta?' : 'Masz już konto?'}{' '}
          <button
            onClick={toggle}
            className="font-medium text-alabaster-50 underline-offset-4 transition-colors hover:underline"
          >
            {isLogin ? 'Zarejestruj się' : 'Zaloguj się'}
          </button>
        </p>

        {/* separator + tryb gościa */}
        <div className="mt-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-white/10" />
          <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-alabaster-50/30">
            lub
          </span>
          <span className="h-px flex-1 bg-white/10" />
        </div>
        <button
          onClick={continueAsGuest}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.03] px-5 py-3.5 text-sm font-medium text-alabaster-50/80 transition-colors duration-200 hover:bg-white/[0.07] hover:text-alabaster-50"
        >
          Kontynuuj jako Gość
          <ArrowRight size={15} strokeWidth={2} />
        </button>
        <p className="mt-3 text-center text-[11px] text-alabaster-50/35">
          Dane zapiszą się lokalnie. Zarejestruj się później, aby przenieść je do chmury.
        </p>
      </motion.div>
    </div>
  )
}

/** Pole formularza w stylu matowego szkła na czerni (glass-on-ink). */
function Field({ icon: Icon, ...props }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 transition-colors focus-within:border-white/25">
      <Icon size={17} strokeWidth={1.5} className="shrink-0 text-alabaster-50/40" />
      <input
        {...props}
        className="w-full bg-transparent text-sm text-alabaster-50 placeholder:text-alabaster-50/35 focus:outline-none"
      />
    </div>
  )
}
