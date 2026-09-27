/**
 * Jednorazowa migracja STARYCH metadanych czasów z localStorage.
 *
 * Wcześniej kary (+2/DNF) i przypisanie czasu do sesji trzymał SessionContext
 * w localStorage — OBOK właściwych danych. Przez to baza nie znała kar
 * (analityka nie widziała DNF-ów), a sesje i kary znikały na innym urządzeniu.
 * Teraz to zwykłe pola solve'a (status, sessionId) w repozytorium, a ten moduł
 * przenosi stare wpisy przez ten sam interfejs repo — działa więc tak samo dla
 * Gościa (localRepo) i zalogowanego (apiRepo).
 *
 * Stare klucze:
 *   cubeverse_solve_meta — { [solveId]: { sessionId, status: 'OK'|'+2'|'DNF' } }
 *   cubeverse_sessions   — [{ id, name }] (z wpisem 'default' = „Główna")
 */
const META_KEY = 'cubeverse_solve_meta'
const SESSIONS_KEY = 'cubeverse_sessions'

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

const LEGACY_STATUS = { '+2': 'PLUS2', DNF: 'DNF' }

// Blokada przed równoległym uruchomieniem (np. podwójny efekt w StrictMode) —
// inaczej ta sama stara sesja mogłaby zostać utworzona dwa razy.
let running = null

/**
 * Przenosi stare metadane czasów obecnych w `solves` do repozytorium.
 * Wpisy dotyczące czasów, których tu nie ma (np. innego konta w tej samej
 * przeglądarce), zostają nietknięte — przeniosą się, gdy tamto konto się zaloguje.
 *
 * @returns {Promise<boolean>} true, jeśli coś zmieniono (trzeba przeładować dane)
 */
export function migrateLegacyMeta(repo, solves) {
  running ??= run(repo, solves).finally(() => {
    running = null
  })
  return running
}

async function run(repo, solves) {
  const meta = readJson(META_KEY, null)
  if (!meta || typeof meta !== 'object') return false

  const ids = new Set(solves.map((s) => s.id))
  const entries = Object.entries(meta).filter(([id]) => ids.has(id))
  if (entries.length === 0) return false

  const legacySessions = readJson(SESSIONS_KEY, [])
  const nameOf = (id) =>
    (Array.isArray(legacySessions) && legacySessions.find((s) => s?.id === id)?.name) || 'Sesja'

  const sessionMap = new Map() // stare lokalne id sesji → id w repozytorium
  let changed = false

  for (const [solveId, m] of entries) {
    const status = LEGACY_STATUS[m?.status] ?? 'OK'
    let sessionId = null
    if (m?.sessionId && m.sessionId !== 'default') {
      if (!sessionMap.has(m.sessionId)) {
        const created = await repo.createSession(nameOf(m.sessionId))
        sessionMap.set(m.sessionId, created.id)
      }
      sessionId = sessionMap.get(m.sessionId)
    }

    // Domyślne wartości (OK + „Główna") nie wymagają zapisu — tylko sprzątamy wpis.
    if (status !== 'OK' || sessionId) {
      await repo.updateSolve(solveId, { status, sessionId })
      changed = true
    }

    // Zapis postępu po KAŻDYM wpisie: przerwana migracja (np. zerwana sieć)
    // przy następnej próbie nie powtórzy już przeniesionych czasów.
    delete meta[solveId]
    localStorage.setItem(META_KEY, JSON.stringify(meta))
  }

  if (Object.keys(meta).length === 0) {
    localStorage.removeItem(META_KEY)
    localStorage.removeItem(SESSIONS_KEY)
  }
  return changed || sessionMap.size > 0
}
