/** Walidacja wejścia systemu znajomych (Zod). */
import { z } from 'zod'

export const requestFriendSchema = z.object({
  username: z.string().trim().min(1, 'Podaj nick.').max(20),
})

export const respondFriendSchema = z.object({
  requestId: z.string().min(1, 'Brak identyfikatora zaproszenia.'),
  accept: z.boolean(),
})
