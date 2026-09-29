/** Walidacja danych logowania/rejestracji (Zod). */
import { z } from 'zod'

// E-mail zapisujemy i porównujemy małymi literami — inaczej „Neo@test.com"
// i „neo@test.com" to dwa różne konta, a logowanie zależy od wielkości liter.
// trim/toLowerCase działają PRZED sprawdzeniem formatu (kolejność ma znaczenie).
const emailSchema = z.string().trim().toLowerCase().email('Niepoprawny adres e-mail.').max(254)

// bcrypt bierze pod uwagę tylko 72 pierwsze BAJTY hasła — reszta jest po cichu
// ucinana (hasło 80-znakowe działałoby też bez ostatnich 8 znaków). Liczymy
// bajty, nie znaki: polska litera to 2 bajty w UTF-8, emoji 4.
const MAX_PASSWORD_BYTES = 72
export const newPasswordSchema = z
  .string()
  .min(8, 'Hasło musi mieć co najmniej 8 znaków.')
  .refine((p) => Buffer.byteLength(p, 'utf8') <= MAX_PASSWORD_BYTES, {
    message: 'Hasło jest za długie (maks. 72 znaki; polskie litery liczą się podwójnie).',
  })

export const registerSchema = z.object({
  email: emailSchema,
  password: newPasswordSchema,
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

// Przy logowaniu NIE sprawdzamy długości hasła — kto założył konto przed
// limitem 72 bajtów, musi dalej móc się zalogować.
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Podaj hasło.'),
})
