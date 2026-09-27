/** Globalny handler błędów — ostatnie ogniwo łańcucha Express. */
export function errorHandler(err, req, res, _next) {
  console.error('[API ERROR]', err)
  const status = err.status ?? 500
  res.status(status).json({
    error: status === 500 ? 'Wewnętrzny błąd serwera.' : err.message,
  })
}
