// ---------------------------------------------------------------------------
// prisma/seed.js — skrypt czyszczący i seedujący bazę CubeVerse
// ---------------------------------------------------------------------------
// Cel: szybkie, powtarzalne środowisko do testów systemu znajomych i
// pojedynków 1v1. Skrypt najpierw BEZPIECZNIE czyści bazę (w kolejności
// zgodnej z więzami FK), a potem tworzy 5 przewidywalnych kont testowych.
//
// Uruchomienie:  npm run seed   (z katalogu server/)
//
// UWAGA: hasło jest haszowane przez bcryptjs z tą samą liczbą rund
// (SALT_ROUNDS = 12) co w src/services/auth.service.js, więc konta od razu
// działają z istniejącym logowaniem JWT.
// ---------------------------------------------------------------------------

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Ta sama liczba rund co w auth.service.js — inaczej hash byłby niekompatybilny.
const SALT_ROUNDS = 12

// Jedno wspólne hasło dla wszystkich kont testowych — łatwe do zapamiętania.
const TEST_PASSWORD = 'Test1234!'

// Dokładnie 5 predefiniowanych użytkowników.
const USERS = [
  { username: 'speedcuber_neo', email: 'neo@test.com', displayName: 'Neo' },
  { username: 'valk_master', email: 'valk@test.com', displayName: 'Valk Master' },
  { username: 'feliks_fan', email: 'feliks@test.com', displayName: 'Feliks Fan' },
  { username: 'sub10_dreamer', email: 'sub10@test.com', displayName: 'Sub10 Dreamer' },
  { username: 'bento_cube', email: 'bento@test.com', displayName: 'Bento Cube' },
]

async function main() {
  console.log('🧹  Czyszczenie bazy (kolejność bezpieczna dla FK)...')

  // KOLEJNOŚĆ MA ZNACZENIE. Najpierw kasujemy tabele "dzieci" (te z kluczami
  // obcymi do User), a User na samym końcu. Dzięki temu nie naruszamy więzów
  // integralności, nawet gdyby kaskady były wyłączone.
  //   Friendship  -> senderId / receiverId -> User
  //   DuelPlayer  -> userId / duelId       -> User / Duel
  //   Solve       -> userId / duelId       -> User / Duel
  //   Duel        -> (nadrzędna dla Solve/DuelPlayer)
  //   User        -> na końcu
  await prisma.friendship.deleteMany()
  await prisma.duelPlayer.deleteMany()
  await prisma.solve.deleteMany()
  await prisma.duel.deleteMany()
  await prisma.user.deleteMany()

  console.log('✅  Baza wyczyszczona.\n')

  // Hasło haszujemy raz — dla wszystkich kont jest identyczne.
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, SALT_ROUNDS)

  console.log('🌱  Tworzenie 5 użytkowników testowych...')
  for (const u of USERS) {
    await prisma.user.create({
      data: {
        email: u.email,
        username: u.username,
        displayName: u.displayName,
        passwordHash,
      },
    })
    console.log(`   • ${u.username.padEnd(16)} (${u.email})`)
  }

  console.log('\n✅  Gotowe! Wszystkie konta mają hasło:', TEST_PASSWORD)
}

main()
  .catch((e) => {
    console.error('❌  Błąd podczas seedowania:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
