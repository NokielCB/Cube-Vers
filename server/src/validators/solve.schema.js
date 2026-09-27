/**
 * Walidacja wejścia (Zod). NIGDY nie ufamy danym z klienta — front może
 * wysłać ujemny czas, gigantyczny scramble albo status spoza enuma.
 */
import { z } from 'zod'

// czas w ms: dodatnia liczba całkowita, z górnym limitem (~2h) na sanity check
const time = z.number().int().positive().max(7_200_000)
const status = z.enum(['OK', 'PLUS2', 'DNF'])
// id sesji (cuid) albo null = domyślna sesja „Główna"
const sessionId = z.string().min(1).max(64).nullable()

export const createSolveSchema = z.object({
  time,
  scramble: z.string().min(1).max(512),
  status: status.optional(),
  sessionId: sessionId.optional(),
})

// PATCH /api/solves/:id — zmiana kary lub przeniesienie do innej sesji.
export const updateSolveSchema = z
  .object({
    status: status.optional(),
    sessionId: sessionId.optional(),
  })
  .strict() // nieznane pola (np. `time`, `userId`) → 400, a nie ciche zignorowanie
  .refine((d) => d.status !== undefined || d.sessionId !== undefined, {
    message: 'Brak zmian do zapisania.',
  })

// GET /api/solves?take=&cursor= — stronicowanie historii.
export const listSolvesQuerySchema = z.object({
  take: z.coerce.number().int().min(1).max(1000).default(1000),
  cursor: z.string().min(1).max(64).optional(),
})

/**
 * Jeden rekord z importu historii Gościa (POST /api/solves/import).
 * Dane pochodzą z localStorage, więc mogą być dowolnie zepsute — pojedyncze
 * złe rekordy odrzucamy (safeParse w serwisie), a nie wywracamy całego importu.
 * `sessionId` to tu LOKALNE id sesji Gościa — serwer mapuje je na nowe.
 */
export const importSolveSchema = z.object({
  time: z.number().transform(Math.round).pipe(time),
  scramble: z.string().min(1).max(512).catch('imported'),
  status: status.catch('OK'),
  createdAt: z.coerce.date().optional().catch(undefined), // zła data → „teraz"
  sessionId: sessionId.optional().catch(null),
})

export const importSessionSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(40),
})

export const importBodySchema = z.object({
  solves: z.array(z.unknown()).max(5000, 'Za dużo rekordów naraz.'),
  sessions: z.array(importSessionSchema).max(50).default([]),
})
