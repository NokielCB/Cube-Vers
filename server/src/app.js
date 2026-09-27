/**
 * Konfiguracja aplikacji Express (bez nasłuchiwania portu — to robi server.js).
 * Rozdzielenie app/server ułatwia testy integracyjne (supertest importuje `app`).
 */
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
import { errorHandler } from './middleware/errorHandler.js'
import { protectRoute } from './middleware/auth.js'

export const app = express()

app.use(helmet()) // bezpieczne nagłówki HTTP

// CORS z ciasteczkami: przy httpOnly cookie MUSI być credentials:true, a
// origin nie może być '*' — trzeba podać konkretny adres frontendu.
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN?.split(',') ?? 'http://localhost:5173',
    credentials: true,
  }),
)

app.use(cookieParser()) // parsuje req.cookies (potrzebne protectRoute)

// Import historii Gościa to jedyne żądanie z dużym body (do 5000 czasów ≈ 1–2 MB).
// Dostaje własny, większy limit — ale DOPIERO po sprawdzeniu logowania, żeby
// anonim nie mógł zmuszać serwera do parsowania megabajtów. Globalny parser
// niżej widzi już sparsowane body i je pomija.
app.post('/api/solves/import', protectRoute, express.json({ limit: '2mb' }))
app.use(express.json({ limit: '16kb' })) // ochrona przed wielkim payloadem

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/solves', solveRoutes)
app.use('/api/sessions', sessionRoutes)
app.use('/api/friends', friendRoutes)
app.use('/api/analytics', analyticsRoutes)

app.use(errorHandler) // musi być NA KOŃCU
