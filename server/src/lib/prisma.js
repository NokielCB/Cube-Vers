// Pojedyncza, współdzielona instancja Prisma Client (singleton).
// Tworzenie nowego klienta na każde zapytanie wyczerpałoby pulę połączeń
// do bazy — dlatego trzymamy jeden egzemplarz na cały proces.
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
})
