/**
 * Walidacja postępu nauki algorytmów (Zod): statusy z Biblioteki i rekordy
 * z trybu treningu. Baza algorytmów żyje we froncie, więc serwer nie zna
 * listy id — pilnujemy za to KSZTAŁTU danych i limitów rozmiaru.
 */
import { z } from 'zod'

// Limity na konto — zwykły bezpiecznik przed zaśmiecaniem bazy. Z dużym
// zapasem: pełne OLL + PLL to 78 algorytmów po kilka wariantów.
export const MAX_STATUSES = 1000
export const MAX_PBS = 3000

// id algorytmu z frontu, np. "oll-27", "pll-ua"
const algId = z.string().regex(/^[a-z0-9-]{1,40}$/, 'Niepoprawne id algorytmu.')
const status = z.enum(['new', 'learning', 'mastered'])
// sekwencja wariantu, np. "R U R' U R U2' R'" — litery, cyfry, apostrof, spacje
const moves = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[A-Za-z0-9' ]+$/, 'Niepoprawna sekwencja ruchów.')
// czas w ms: dodatnia liczba całkowita, sanity check do godziny
const time = z.number().int().positive().max(3_600_000)

// PUT /api/progress/statuses/:algId  { status }
export const statusParamsSchema = z.object({ algId })
export const statusBodySchema = z.object({ status }).strict()

// POST /api/progress/pbs  { algId, moves, time }
export const pbBodySchema = z.object({ algId, moves, time }).strict()

/**
 * Z obiektu { klucz: wartość } zostawia tylko poprawne wpisy (już po parsowaniu).
 * Dane z localStorage mogą być zepsute — złe wpisy odrzucamy pojedynczo,
 * zamiast przez jeden śmieć blokować cały import (tak jak przy imporcie czasów).
 */
function keepValid(obj, keySchema, valueSchema) {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = keySchema.safeParse(k)
    const val = valueSchema.safeParse(v)
    if (key.success && val.success) out[key.data] = val.data
  }
  return out
}

const countPbs = (pbs) => Object.values(pbs).reduce((n, byMoves) => n + Object.keys(byMoves).length, 0)

// POST /api/progress/import  { statuses: { algId: status }, pbs: { algId: { moves: ms } } }
// Dane lecą z localStorage (migracja Gościa / starych danych tej przeglądarki).
export const importProgressSchema = z.object({
  statuses: z
    .record(z.unknown())
    .default({})
    .transform((o) => keepValid(o, algId, status))
    .refine((o) => Object.keys(o).length <= MAX_STATUSES, 'Za dużo statusów naraz.'),
  pbs: z
    .record(z.unknown())
    .default({})
    .transform((o) => {
      const out = {}
      for (const [id, byMoves] of Object.entries(o)) {
        if (!algId.safeParse(id).success || !byMoves || typeof byMoves !== 'object') continue
        const valid = keepValid(byMoves, moves, time)
        if (Object.keys(valid).length) out[id] = valid
      }
      return out
    })
    .refine((o) => countPbs(o) <= MAX_PBS, 'Za dużo rekordów naraz.'),
})
