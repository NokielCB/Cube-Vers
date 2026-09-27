/**
 * Walidacja wejścia (Zod). NIGDY nie ufamy danym z klienta — front może
 * wysłać ujemny czas, gigantyczny scramble albo status spoza enuma.
 */
import { z } from 'zod'

export const createSolveSchema = z.object({
  // czas w ms: dodatnia liczba całkowita, z górnym limitem (~2h) na sanity check
  time: z.number().int().positive().max(7_200_000),
  scramble: z.string().min(1).max(512),
  status: z.enum(['OK', 'PLUS2', 'DNF']).optional(),
})
