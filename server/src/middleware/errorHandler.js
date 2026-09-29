/** Globalny handler błędów — ostatnie ogniwo łańcucha Express. */
export function errorHandler(err, req, res, _next) {
  // P2002 = naruszenie @unique (np. dwa identyczne żądania naraz). To konflikt
  // danych, nie awaria serwera — 409 zamiast 500, bez zaśmiecania logów.
  if (err?.code === 'P2002') {
    return res.status(409).json({ error: 'Taki wpis już istnieje.' })
  }

  console.error('[API ERROR]', err)
  const status = err.status ?? 500
  res.status(status).json({
    error: status === 500 ? 'Wewnętrzny błąd serwera.' : err.message,
  })
}
