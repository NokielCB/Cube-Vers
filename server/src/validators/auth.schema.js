/** Walidacja danych logowania/rejestracji (Zod). */
import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email('Niepoprawny adres e-mail.'),
  password: z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków.').max(128),
  // Nazwa gracza (displayName) jest opcjonalna przy rejestracji — użytkownik
  // ustawia/zmienia ją później w Ustawieniach. Może się powtarzać między kontami.
  displayName: z.string().trim().min(1).max(40).optional(),
  // Nick (username) — WYMAGANY, unikalny publiczny identyfikator do wyszukiwania
  // w systemie znajomych. Backend normalizuje go do małych liter.
  username: z
    .string({ required_error: 'Podaj swój nick.' })
    .trim()
    .min(3, 'Nick musi mieć co najmniej 3 znaki.')
    .max(20, 'Nick może mieć maksymalnie 20 znaków.')
    .regex(/^[a-zA-Z0-9_]+$/, 'Nick: tylko litery, cyfry i podkreślenie.'),
})

export const loginSchema = z.object({
  email: z.string().email('Niepoprawny adres e-mail.'),
  password: z.string().min(1, 'Podaj hasło.'),
})
