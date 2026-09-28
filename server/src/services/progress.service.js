/**
 * Warstwa serwisowa postępu nauki algorytmów: statusy (Biblioteka) i rekordy
 * z trybu treningu (per algorytm I per wariant). Jak w reszcie serwisów:
 * każde zapytanie filtruje po `userId` z tokenu — cudzych danych nie dotkniesz.
 *
 * Odpowiedzi mają kształt, którego używa front (mapy zamiast list):
 *   statuses: { [algId]: 'new' | 'learning' | 'mastered' }
 *   pbs:      { [algId]: { [sekwencja wariantu]: ms } }
 */
import { prisma } from '../lib/prisma.js'
import { MAX_PBS, MAX_STATUSES } from '../validators/progress.schema.js'

function httpError(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

/** Cały postęp usera jednym żądaniem — front ładuje go razem przy starcie. */
export async function getProgress(userId) {
  const [statusRows, pbRows] = await Promise.all([
    prisma.algorithmStatus.findMany({ where: { userId }, select: { algId: true, status: true } }),
    prisma.algorithmPb.findMany({ where: { userId }, select: { algId: true, moves: true, time: true } }),
  ])

  const statuses = Object.fromEntries(statusRows.map((r) => [r.algId, r.status]))
  const pbs = {}
  for (const r of pbRows) (pbs[r.algId] ??= {})[r.moves] = r.time
  return { statuses, pbs }
}

/** Ustawia status nauki (upsert). Nowy wpis tylko w granicy limitu na konto. */
export async function setStatus(userId, algId, status) {
  const where = { userId_algId: { userId, algId } }
  const exists = await prisma.algorithmStatus.count({ where: { userId, algId } })
  if (!exists && (await prisma.algorithmStatus.count({ where: { userId } })) >= MAX_STATUSES) {
    throw httpError(409, 'Osiągnięto limit statusów algorytmów.')
  }
  return prisma.algorithmStatus.upsert({
    where,
    create: { userId, algId, status },
    update: { status },
    select: { algId: true, status: true },
  })
}

/**
 * Zgłasza czas z treningu. Zapisujemy go TYLKO, jeśli bije dotychczasowy
 * rekord — warunek siedzi w samym zapytaniu (`time > nowy`), więc dwa
 * równoległe żądania (np. dwa urządzenia) nie nadpiszą lepszego czasu gorszym.
 *
 * Zwraca rekord, który OBOWIĄZUJE po operacji — front synchronizuje się
 * z nim (np. gdy inne urządzenie ma już lepszy czas).
 */
export async function recordPb(userId, algId, moves, time) {
  const key = { userId, algId, moves }

  // 1) Rekord istnieje i jest gorszy → poprawiamy.
  const { count } = await prisma.algorithmPb.updateMany({
    where: { ...key, time: { gt: time } },
    data: { time },
  })
  if (count) return { algId, moves, time, improved: true }

  // 2) Istnieje i jest lepszy/równy → nic nie zmieniamy.
  const current = await prisma.algorithmPb.findUnique({
    where: { userId_algId_moves: key },
    select: { time: true },
  })
  if (current) return { algId, moves, time: current.time, improved: false }

  // 3) Pierwszy czas tego wariantu → nowy rekord (w granicy limitu na konto).
  if ((await prisma.algorithmPb.count({ where: { userId } })) >= MAX_PBS) {
    throw httpError(409, 'Osiągnięto limit rekordów algorytmów.')
  }
  try {
    await prisma.algorithmPb.create({ data: { ...key, time } })
    return { algId, moves, time, improved: true }
  } catch (err) {
    // P2002 = w międzyczasie inne żądanie utworzyło ten rekord → spróbuj go
    // poprawić jeszcze raz (warunkowo), a w odpowiedzi oddaj stan z bazy.
    if (err?.code !== 'P2002') throw err
    return recordPb(userId, algId, moves, time)
  }
}

/**
 * Import postępu z localStorage (Gość → konto, albo jednorazowo stare dane
 * tej przeglądarki). Scalanie NIE niszczy danych w chmurze:
 *  - statusy: dopisujemy tylko brakujące (chmura wygrywa),
 *  - rekordy: zostaje lepszy z dwóch czasów.
 * Nowe wpisy przycinamy do wolnego miejsca w limicie konta.
 */
export async function importProgress(userId, { statuses, pbs }) {
  const [statusRows, pbRows] = await Promise.all([
    prisma.algorithmStatus.findMany({ where: { userId }, select: { algId: true } }),
    prisma.algorithmPb.findMany({ where: { userId }, select: { algId: true, moves: true, time: true } }),
  ])

  // — statusy: tylko te, których w chmurze jeszcze nie ma —
  const haveStatus = new Set(statusRows.map((r) => r.algId))
  const newStatuses = Object.entries(statuses)
    .filter(([algId]) => !haveStatus.has(algId))
    .slice(0, Math.max(0, MAX_STATUSES - statusRows.length))
    .map(([algId, status]) => ({ userId, algId, status }))

  // — rekordy: nowe warianty dopisujemy, istniejące poprawiamy, gdy import jest lepszy —
  const cloudPb = new Map(pbRows.map((r) => [`${r.algId}\n${r.moves}`, r.time]))
  const incoming = Object.entries(pbs).flatMap(([algId, byMoves]) =>
    Object.entries(byMoves).map(([moves, time]) => ({ userId, algId, moves, time })),
  )
  const newPbs = incoming
    .filter((p) => !cloudPb.has(`${p.algId}\n${p.moves}`))
    .slice(0, Math.max(0, MAX_PBS - pbRows.length))
  const betterPbs = incoming.filter((p) => {
    const cur = cloudPb.get(`${p.algId}\n${p.moves}`)
    return cur != null && p.time < cur
  })

  // Jedna transakcja: import wchodzi w całości albo wcale.
  await prisma.$transaction([
    prisma.algorithmStatus.createMany({ data: newStatuses, skipDuplicates: true }),
    prisma.algorithmPb.createMany({ data: newPbs, skipDuplicates: true }),
    ...betterPbs.map(({ algId, moves, time }) =>
      prisma.algorithmPb.updateMany({ where: { userId, algId, moves, time: { gt: time } }, data: { time } }),
    ),
  ])

  return {
    statuses: newStatuses.length,
    pbs: newPbs.length + betterPbs.length,
    progress: await getProgress(userId),
  }
}
