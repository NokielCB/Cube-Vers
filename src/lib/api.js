/**
 * Cienki klient REST API. Jedno miejsce, które wie, gdzie jest backend i jak
 * z nim gadać.
 *
 * KLUCZOWE: `credentials: 'include'` sprawia, że przeglądarka DOŁĄCZA nasze
 * httpOnly cookie do każdego żądania (i przyjmuje Set-Cookie z odpowiedzi).
 * Bez tego sesja oparta o ciasteczko w ogóle by nie działała cross-origin.
 */
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error ?? 'Coś poszło nie tak.')
  }
  return data
}

export const api = {
  register: (payload) => request('/api/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),

  updateUser: (payload) => request('/api/user/update', { method: 'PUT', body: payload }),

  getSolves: () => request('/api/solves'),
  createSolve: (payload) => request('/api/solves', { method: 'POST', body: payload }),
  deleteSolve: (id) => request(`/api/solves/${id}`, { method: 'DELETE' }),
  clearSolves: () => request('/api/solves/clear', { method: 'DELETE' }),
  importSolves: (solves) => request('/api/solves/import', { method: 'POST', body: { solves } }),

  getAnalytics: () => request('/api/analytics/summary'),

  // — System znajomych —
  listFriends: () => request('/api/friends/list'),
  requestFriend: (username) => request('/api/friends/request', { method: 'POST', body: { username } }),
  respondFriend: (requestId, accept) =>
    request('/api/friends/respond', { method: 'PUT', body: { requestId, accept } }),
}
