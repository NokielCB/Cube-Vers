/**
 * Lista zaufanych adresów frontendu (CLIENT_ORIGIN, po przecinku) — JEDNO
 * źródło dla CORS, ochrony CSRF i handshake'u WebSocketa.
 */
export const allowedOrigins = (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

export const isAllowedOrigin = (origin) => allowedOrigins.includes(origin)

/**
 * Ochrona CSRF: żądanie zmieniające dane (POST/PUT/PATCH/DELETE) z obcej
 * strony odrzucamy, zanim dotknie kontrolera.
 *
 * Dlaczego samo CORS nie wystarcza: CORS blokuje tylko ODCZYT odpowiedzi.
 * Zwykły <form method="POST"> z obcej strony i tak dociera do serwera — razem
 * z ciasteczkiem, jeśli przeglądarka je dołączy (przy COOKIE_SAMESITE=none
 * dołączy). Przeglądarka zawsze wysyła przy takim żądaniu nagłówek Origin,
 * którego strona nie może podrobić, więc wystarczy go sprawdzić.
 *
 * Brak nagłówka Origin (curl, skrypty, serwer-serwer) przepuszczamy — takie
 * żądanie nie niesie ciasteczek ofiary, więc nie jest atakiem CSRF.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function rejectForeignOrigin(req, res, next) {
  const origin = req.get('Origin')
  if (SAFE_METHODS.has(req.method) || !origin || isAllowedOrigin(origin)) return next()
  res.status(403).json({ error: 'Niedozwolone źródło żądania.' })
}
