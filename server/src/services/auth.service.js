/**
 * Warstwa serwisowa autoryzacji — cała logika haseł i tokenów w jednym miejscu.
 * Kontrolery nie znają bcrypta ani JWT; wołają tylko te funkcje.
 */
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'

// Liczba rund solenia. 10–12 to rozsądny kompromis bezpieczeństwo/szybkość.
// Każda runda PODWAJA koszt łamania — 12 rund jest ~4× wolniejsze niż 10.
const SALT_ROUNDS = 12
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60 // jak długo token jest ważny (7 dni, jak ciasteczko)

// „Atrapa" hasha do logowania na NIEISTNIEJĄCY e-mail. Bez niej odpowiedź
// przychodziła w ~4 ms (brak konta = brak bcrypta) zamiast ~260 ms, więc po
// samym czasie dało się sprawdzić, które e-maile mają konto. Liczona leniwie
// raz, z tą samą liczbą rund co prawdziwe hasła (ten sam koszt porównania).
let dummyHashPromise = null
const dummyHash = () => (dummyHashPromise ??= bcrypt.hash('cubeverse-timing-dummy', SALT_ROUNDS))
void dummyHash() // liczymy od razu przy starcie, żeby 1. logowanie nie było wolniejsze

/** Publiczny kształt usera — NIGDY nie wypuszczamy passwordHash. */
function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username ?? null, // publiczny nick do systemu znajomych
    displayName: user.displayName,
    createdAt: user.createdAt, // data dołączenia — do panelu konta
  }
}

/** Zamienia dowolny tekst w bezpieczny rdzeń nicka: [a-z0-9_], 3–20 znaków. */
function slugifyUsername(base) {
  const slug = String(base ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9_]+/g, '')
    .slice(0, 20)
  return slug.length >= 3 ? slug : `cuber${slug}`
}

/**
 * Znajduje wolny username startując od `base`. W razie kolizji dokłada krótki
 * losowy sufiks i próbuje ponownie. Zwraca gwarantowanie wolną wartość
 * (unikalność i tak jest twardo egzekwowana przez @unique w bazie).
 */
async function findFreeUsername(base) {
  const root = slugifyUsername(base)
  const candidates = [root]
  for (let i = 0; i < 6; i++) {
    candidates.push(`${root.slice(0, 14)}_${Math.random().toString(36).slice(2, 6)}`)
  }
  for (const cand of candidates) {
    const taken = await prisma.user.findUnique({ where: { username: cand } })
    if (!taken) return cand
  }
  // Skrajny fallback — praktycznie nieosiągalny.
  return `cuber_${Date.now().toString(36)}`
}

/**
 * Loguje urządzenie: tworzy rekord AuthSession i podpisuje JWT z jego id (`sid`).
 * Sam podpis nie wystarcza do wejścia — verifySessionToken sprawdza też, czy
 * rekord wciąż istnieje. Przy okazji sprzątamy wygasłe sesje tego usera.
 */
export async function createSessionToken(userId) {
  const now = Date.now()
  await prisma.authSession.deleteMany({ where: { userId, expiresAt: { lt: new Date(now) } } })
  const session = await prisma.authSession.create({
    data: { userId, expiresAt: new Date(now + TOKEN_TTL_SECONDS * 1000) },
  })
  return jwt.sign({ sub: userId, sid: session.id }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: TOKEN_TTL_SECONDS,
  })
}

/**
 * Sprawdza token: podpis + ważność (jwt.verify) ORAZ istnienie sesji w bazie.
 * Token po wylogowaniu albo po zmianie hasła na innym urządzeniu ma poprawny
 * podpis, ale jego sesji już nie ma — więc zostaje odrzucony.
 *
 * @returns {Promise<{ userId: string, sessionId: string } | null>}
 */
export async function verifySessionToken(token) {
  let payload
  try {
    // algorithms: przypinamy HS256 — token podpisany innym algorytmem odpada.
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
  } catch {
    return null
  }
  if (!payload?.sub || !payload?.sid) return null // np. stary token sprzed sesji w bazie
  const session = await prisma.authSession.findFirst({
    where: { id: payload.sid, userId: payload.sub, expiresAt: { gt: new Date() } },
    select: { id: true },
  })
  return session ? { userId: payload.sub, sessionId: session.id } : null
}

/** Wylogowanie jednego urządzenia. */
export function revokeSession(sessionId) {
  return prisma.authSession.deleteMany({ where: { id: sessionId } })
}

/**
 * Wylogowanie wszystkich urządzeń POZA bieżącym (po zmianie hasła).
 * Zwraca id unieważnionych sesji — żeby rozłączyć też ich WebSockety.
 */
export async function revokeOtherSessions(userId, keepSessionId) {
  const others = await prisma.authSession.findMany({
    where: { userId, id: { not: keepSessionId } },
    select: { id: true },
  })
  if (others.length) {
    await prisma.authSession.deleteMany({ where: { id: { in: others.map((s) => s.id) } } })
  }
  return others.map((s) => s.id)
}

/**
 * Rejestracja: haszuje hasło (bcrypt sam generuje i wkleja salt do hasha)
 * i zapisuje usera. Rzuca, gdy e-mail zajęty.
 */
export async function registerUser({ email, password, displayName, username }) {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    const err = new Error('Ten adres e-mail jest już zajęty.')
    err.status = 409
    throw err
  }

  // Nick jest WYMAGANY (walidator to gwarantuje). Normalizujemy do małych liter,
  // żeby uniknąć par typu "Alice" / "alice" i by wyszukiwanie było jednoznaczne.
  const finalUsername = String(username).trim().toLowerCase()
  const taken = await prisma.user.findUnique({ where: { username: finalUsername } })
  if (taken) {
    const err = new Error('Ten nick jest już zajęty.')
    err.status = 409
    throw err
  }

  // Nazwa gracza (może się powtarzać). Jeśli pominięta przy rejestracji,
  // startowo pokazujemy nick — użytkownik zmieni ją później w Ustawieniach.
  const finalDisplayName = displayName?.trim() || finalUsername

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  const user = await prisma.user.create({
    data: { email, passwordHash, displayName: finalDisplayName, username: finalUsername },
  })
  return toPublicUser(user)
}

/**
 * Leniwy backfill nicka dla istniejących kont (powstałych przed polem username).
 * Wołane przy pierwszym wejściu do Social Hub. Idempotentne: jeśli nick już jest,
 * po prostu go zwraca.
 */
export async function getOrCreateUsername(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return null
  if (user.username) return user.username
  const username = await findFreeUsername(user.displayName || user.email.split('@')[0])
  const updated = await prisma.user.update({ where: { id: userId }, data: { username } })
  return updated.username
}

/**
 * Logowanie: porównuje hasło z hashem. Obrona przed enumeracją kont ma DWIE
 * części — obie są potrzebne:
 *   1) ten sam komunikat dla „nie ma takiego e-maila" i „złe hasło",
 *   2) ten sam CZAS odpowiedzi: brak konta też kosztuje jedno porównanie
 *      bcrypt (z atrapą), inaczej różnicę widać w stoperze.
 */
export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } })
  const hash = user?.passwordHash ?? (await dummyHash())
  const passwordOk = await bcrypt.compare(password, hash)
  const ok = Boolean(user) && passwordOk
  if (!ok) {
    const err = new Error('Niepoprawny e-mail lub hasło.')
    err.status = 401
    throw err
  }
  return toPublicUser(user)
}

/** Pobiera publiczny profil po id (do endpointu /me). */
export async function getUserById(id) {
  const user = await prisma.user.findUnique({ where: { id } })
  return user ? toPublicUser(user) : null
}

/**
 * Aktualizacja profilu: opcjonalna zmiana nazwy i/lub hasła.
 * Zmiana hasła WYMAGA podania poprawnego starego hasła (bcrypt.compare) —
 * inaczej rzuca błąd z kodem BAD_OLD_PASSWORD (kontroler liczy to jako próbę
 * brute force i uruchamia limiter).
 */
export async function updateUser(userId, { displayName, currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    const err = new Error('Nie znaleziono użytkownika.')
    err.status = 404
    throw err
  }

  const data = {}
  if (displayName !== undefined) data.displayName = displayName

  if (newPassword) {
    const ok = currentPassword && (await bcrypt.compare(currentPassword, user.passwordHash))
    if (!ok) {
      const err = new Error('Stare hasło jest niepoprawne.')
      err.status = 401
      err.code = 'BAD_OLD_PASSWORD'
      throw err
    }
    data.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS)
  }

  if (Object.keys(data).length === 0) {
    const err = new Error('Brak zmian do zapisania.')
    err.status = 400
    throw err
  }

  const updated = await prisma.user.update({ where: { id: userId }, data })
  return toPublicUser(updated)
}
