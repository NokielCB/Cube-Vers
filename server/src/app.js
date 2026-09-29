/**
 * Konfiguracja aplikacji Express (bez nasłuchiwania portu — to robi server.js).
 * Rozdzielenie app/server ułatwia testy integracyjne (supertest importuje `app`).
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import authRoutes from './routes/auth.routes.js'
import userRoutes from './routes/user.routes.js'
import solveRoutes from './routes/solve.routes.js'
import friendRoutes from './routes/friend.routes.js'
import analyticsRoutes from './routes/analytics.routes.js'
import sessionRoutes from './routes/session.routes.js'
import progressRoutes from './routes/progress.routes.js'
import { errorHandler } from './middleware/errorHandler.js'
import { protectRoute } from './middleware/auth.js'
import { allowedOrigins, rejectForeignOrigin } from './lib/origins.js'

export const app = express()

// Za reverse proxy (Render, nginx…) req.ip to adres PROXY, chyba że Express
// ufa nagłówkowi X-Forwarded-For. Limiter logowania działa po IP, więc bez tego
// jedna osoba zgadująca hasło zablokowałaby logowanie wszystkim. TRUST_PROXY =
// liczba proxy przed serwerem (lokalnie brak → Express nie ufa nagłówkowi,
// którego klient mógłby podrobić).
const trustProxy = Number(process.env.TRUST_PROXY)
if (trustProxy > 0) app.set('trust proxy', trustProxy)

app.use(helmet()) // bezpieczne nagłówki HTTP

// CORS z ciasteczkami: przy httpOnly cookie MUSI być credentials:true, a
// origin nie może być '*' — trzeba podać konkretny adres frontendu.
app.use(cors({ origin: allowedOrigins, credentials: true }))
app.use(rejectForeignOrigin) // CSRF: zapis z obcej strony → 403 (szczegóły w lib/origins.js)

app.use(cookieParser()) // parsuje req.cookies (potrzebne protectRoute)

// Import historii Gościa to jedyne żądanie z dużym body (do 5000 czasów ≈ 1–2 MB).
// Dostaje własny, większy limit — ale DOPIERO po sprawdzeniu logowania, żeby
// anonim nie mógł zmuszać serwera do parsowania megabajtów. Globalny parser
// niżej widzi już sparsowane body i je pomija.
app.post('/api/solves/import', protectRoute, express.json({ limit: '2mb' }))
// Import postępu algorytmów (statusy + rekordy z localStorage) — ta sama zasada.
app.post('/api/progress/import', protectRoute, express.json({ limit: '512kb' }))
app.use(express.json({ limit: '16kb' })) // ochrona przed wielkim payloadem

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/solves', solveRoutes)
app.use('/api/sessions', sessionRoutes)
app.use('/api/progress', progressRoutes)
app.use('/api/friends', friendRoutes)
app.use('/api/analytics', analyticsRoutes)

// Tryb „jedna usługa": backend sam wydaje zbudowany frontend (dist/). Frontend i API
// mają wtedy TEN SAM adres, więc nie ma CORS-a ani ciasteczek cross-site (działa też
// na Safari/iPhone). Włączane zmienną SERVE_CLIENT=true — lokalnie front daje Vite.
if (process.env.SERVE_CLIENT === 'true') {
  const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist')
  app.use(express.static(distDir))
  // SPA: każda inna ścieżka GET (poza /api i socket.io) dostaje index.html.
  app.get(/^\/(?!api\/|socket\.io\/).*/, (_req, res) => res.sendFile(path.join(distDir, 'index.html')))
}

app.use(errorHandler) // musi być NA KOŃCU
