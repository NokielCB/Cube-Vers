/**
 * Cienki klient REST API. Jedno miejsce, które wie, gdzie jest backend i jak
 * z nim gadać.
 *
 * KLUCZOWE: `credentials: 'include'` sprawia, że przeglądarka DOŁĄCZA nasze
 * httpOnly cookie do każdego żądania (i przyjmuje Set-Cookie z odpowiedzi).
 * Bez tego sesja oparta o ciasteczko w ogóle by nie działała cross-origin.
 */
// Produkcja domyślnie: ten sam adres co strona (backend wydaje frontend). Dev: lokalny API.
const BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:4000')

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error ?? 'Coś poszło nie tak.')
    err.status = res.status // np. 404 — wywołujący może zareagować inaczej niż na awarię sieci
    throw err
  }
  return data
}

export const api = {
  register: (payload) => request('/api/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),

  updateUser: (payload) => request('/api/user/update', { method: 'PUT', body: payload }),

  // Jedna strona historii (max 1000); `cursor` = id ostatniego solve'a poprzedniej strony.
  getSolves: (cursor) =>
    request(`/api/solves${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
  createSolve: (payload) => request('/api/solves', { method: 'POST', body: payload }),
  // patch: { status } i/lub { sessionId } — kara albo przeniesienie do sesji
  updateSolve: (id, patch) => request(`/api/solves/${id}`, { method: 'PATCH', body: patch }),
  deleteSolve: (id) => request(`/api/solves/${id}`, { method: 'DELETE' }),
  clearSolves: () => request('/api/solves/clear', { method: 'DELETE' }),
  importSolves: (solves, sessions = []) =>
    request('/api/solves/import', { method: 'POST', body: { solves, sessions } }),

  // — Sesje układania —
  listSessions: () => request('/api/sessions'),
  createSession: (name) => request('/api/sessions', { method: 'POST', body: { name } }),
  renameSession: (id, name) => request(`/api/sessions/${id}`, { method: 'PATCH', body: { name } }),
  deleteSession: (id) => request(`/api/sessions/${id}`, { method: 'DELETE' }),

  getAnalytics: () => request('/api/analytics/summary'),

  // — Postęp nauki algorytmów: statusy, rekordy z treningu, notatki, wariant główny —
  getProgress: () => request('/api/progress'),
  setAlgStatus: (algId, status) =>
    request(`/api/progress/statuses/${encodeURIComponent(algId)}`, { method: 'PUT', body: { status } }),
  // Serwer zapisze czas tylko, jeśli bije rekord; oddaje rekord obowiązujący po zapisie.
  recordAlgPb: (payload) => request('/api/progress/pbs', { method: 'POST', body: payload }),
  // Cały tekst notatki ('' = usuń) i sekwencja wariantu z „Ustaw jako główny".
  setAlgNote: (algId, note) =>
    request(`/api/progress/notes/${encodeURIComponent(algId)}`, { method: 'PUT', body: { note } }),
  setAlgPrimary: (algId, moves) =>
    request(`/api/progress/primary/${encodeURIComponent(algId)}`, { method: 'PUT', body: { moves } }),
  importProgress: (payload) => request('/api/progress/import', { method: 'POST', body: payload }),

  // — System znajomych —
  listFriends: () => request('/api/friends/list'),
  requestFriend: (username) => request('/api/friends/request', { method: 'POST', body: { username } }),
  respondFriend: (requestId, accept) =>
    request('/api/friends/respond', { method: 'PUT', body: { requestId, accept } }),
}
