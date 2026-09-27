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
const TOKEN_TTL = '7d' // jak długo token jest ważny

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

/** Podpisuje JWT z userId w polu `sub`. */
export function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL })
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
 * Logowanie: porównuje hasło z hashem. Ważne — ten sam komunikat błędu dla
 * „nie ma takiego e-maila" i „złe hasło", żeby nie zdradzać, które konta
 * istnieją (obrona przed enumeracją użytkowników).
 */
export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } })
  const ok = user && (await bcrypt.compare(password, user.passwordHash))
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
