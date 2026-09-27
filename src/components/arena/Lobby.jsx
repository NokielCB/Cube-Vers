import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Copy, Check, Dice5, Wifi, WifiOff } from 'lucide-react'

/**
 * Lobby — luksusowy, minimalistyczny ekran wejścia do pokoju sieciowego.
 * Dwie drogi: wygeneruj nowy kod (i podaj go rywalowi) albo wpisz istniejący.
 *
 * @param {{ connected:boolean, onJoin:(code:string)=>void, error:string|null }} props
 */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // bez mylących 0/O, 1/I

function randomCode(len = 5) {
  let out = ''
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[(Math.random() * CODE_ALPHABET.length) | 0]
  return out
}

export default function Lobby({ connected, onJoin, error }) {
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)

  const generate = () => {
    const c = randomCode()
    setCode(c)
    setCopied(false)
  }

  const copy = async () => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* schowek może być zablokowany — ignorujemy po cichu */
    }
  }

  const submit = (e) => {
    e.preventDefault()
    const clean = code.trim().toUpperCase()
    if (clean) onJoin(clean)
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-10 sm:px-6 md:pb-24 md:pt-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 22 }}
        className="tile overflow-hidden p-6 sm:p-8 lg:p-10"
      >
        {/* status połączenia */}
        <div className="flex items-center gap-2 text-ink-400">
          {connected ? (
            <Wifi size={15} strokeWidth={1.5} className="text-emerald-500" />
          ) : (
            <WifiOff size={15} strokeWidth={1.5} className="text-ink-300" />
          )}
          <span className="text-[11px] font-medium uppercase tracking-[0.14em]">
            {connected ? 'Połączono z serwerem' : 'Łączenie…'}
          </span>
        </div>

        <h1 className="mt-8 text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
          Online Duel
          <br />
          <span className="text-ink-400">gracz kontra gracz.</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-500">
          Utwórz pokój i przekaż kod rywalowi, albo wpisz kod, który dostałeś. Wspólny scramble
          rozdaje serwer — start dopiero, gdy obaj będziecie w środku.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <div className="flex items-stretch gap-2">
            <div className="relative flex-1">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="KOD POKOJU"
                maxLength={8}
                className="w-full rounded-2xl border border-ink-900/[0.08] bg-white/60 px-5 py-4 font-mono text-lg tracking-[0.3em] text-ink-950 placeholder:tracking-[0.14em] placeholder:text-ink-300 focus:border-ink-900/25 focus:outline-none"
              />
              {code && (
                <button
                  type="button"
                  onClick={copy}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-900/[0.04] hover:text-ink-700"
                  title="Kopiuj kod"
                >
                  {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={generate}
              className="flex items-center gap-2 rounded-2xl border border-ink-900/[0.08] bg-white/50 px-4 text-sm font-medium text-ink-600 transition-colors hover:border-ink-900/20"
              title="Wygeneruj nowy kod"
            >
              <Dice5 size={17} strokeWidth={1.5} />
            </button>
          </div>

          <button
            type="submit"
            disabled={!connected || !code.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink-950 px-5 py-4 text-sm font-medium text-alabaster-50 transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Wejdź do pokoju
            <ArrowRight size={16} strokeWidth={2} />
          </button>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-xs font-medium text-rose-500"
            >
              {error}
            </motion.p>
          )}
        </form>
      </motion.div>
    </div>
  )
}
