/** Walidacja aktualizacji profilu. Wszystko opcjonalne, ale hasło parami. */
import { z } from 'zod'

export const updateUserSchema = z
  .object({
    displayName: z.string().min(1).max(40).optional(),
    currentPassword: z.string().min(1).optional(),
    newPassword: z.string().min(8, 'Nowe hasło musi mieć min. 8 znaków.').max(128).optional(),
  })
  .refine((d) => !d.newPassword || d.currentPassword, {
    message: 'Aby zmienić hasło, podaj stare hasło.',
    path: ['currentPassword'],
  })
