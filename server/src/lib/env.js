/**
 * Walidacja konfiguracji PRZY STARCIE — lepiej, żeby serwer w ogóle nie wstał,
 * niż żeby działał z dziurą, której nikt nie zauważy.
 *
 * Najważniejszy jest JWT_SECRET: kto go zna, może podpisać token na DOWOLNE
 * konto. Wartość z .env.example jest publiczna (leży w repo), więc traktujemy
 * ją jak brak sekretu.
 */
const PLACEHOLDER_SECRETS = ['zmien-mnie-na-cos-dlugiego-i-losowego']
const MIN_SECRET_LENGTH = 32

export function assertEnv() {
  const problems = []
  const secret = process.env.JWT_SECRET ?? ''

  if (!secret) problems.push('brak JWT_SECRET')
  else if (PLACEHOLDER_SECRETS.includes(secret)) problems.push('JWT_SECRET to przykładowa wartość z .env.example')
  else if (secret.length < MIN_SECRET_LENGTH) problems.push(`JWT_SECRET ma < ${MIN_SECRET_LENGTH} znaków`)

  if (!process.env.DATABASE_URL) problems.push('brak DATABASE_URL')

  if (problems.length) {
    console.error(
      `❌ Niepoprawna konfiguracja serwera (server/.env):\n  - ${problems.join('\n  - ')}\n` +
        'Nowy sekret wygenerujesz komendą:\n' +
        '  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"',
    )
    process.exit(1)
  }

  // Na produkcji ciasteczko sesji MUSI mieć flagę Secure (tylko HTTPS) —
  // cookieOptions() włącza ją wyłącznie przy NODE_ENV=production.
  if (process.env.NODE_ENV !== 'production' && process.env.CLIENT_ORIGIN?.startsWith('https://')) {
    console.warn('⚠️  CLIENT_ORIGIN używa https, a NODE_ENV ≠ production — ciasteczko sesji nie ma flagi Secure.')
  }
}
