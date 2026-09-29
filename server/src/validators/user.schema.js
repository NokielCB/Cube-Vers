/** Walidacja aktualizacji profilu. Wszystko opcjonalne, ale hasło parami. */
import { z } from 'zod'
import { newPasswordSchema } from './auth.schema.js'

export const updateUserSchema = z
  .object({
    displayName: z.string().min(1).max(40).optional(),
    currentPassword: z.string().min(1).optional(),
    newPassword: newPasswordSchema.optional(),
  })
  .refine((d) => !d.newPassword || d.currentPassword, {
    message: 'Aby zmienić hasło, podaj stare hasło.',
    path: ['currentPassword'],
  })
