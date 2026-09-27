/** Walidacja nazwanych sesji układania (Zod). */
import { z } from 'zod'

export const sessionNameSchema = z.object({
  name: z.string().trim().min(1, 'Podaj nazwę sesji.').max(40, 'Nazwa sesji: maks. 40 znaków.'),
})
