/**
 * Warstwa serwisowa postępu nauki algorytmów: statusy (Biblioteka), rekordy
 * z trybu treningu (per algorytm I per wariant), notatki i wybór „Ustaw jako
 * główny". Jak w reszcie serwisów:
 * każde zapytanie filtruje po `userId` z tokenu — cudzych danych nie dotkniesz.
 *
 * Odpowiedzi mają kształt, którego używa front (mapy zamiast list):
 *   statuses: { [algId]: 'new' | 'learning' | 'mastered' }
 *   pbs:      { [algId]: { [sekwencja wariantu]: ms } }
 *   notes:        { [algId]: tekst }
 *   primaryMoves: { [algId]: sekwencja wariantu }
 */
import { prisma } from '../lib/prisma.js'
import { MAX_PBS, MAX_PREFS, MAX_STATUSES } from '../validators/progress.schema.js'

function httpError(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

/** Cały postęp usera jednym żądaniem — front ładuje go razem przy starcie. */
export async function getProgress(userId) {
  const [statusRows, pbRows, prefRows] = await Promise.all([
    prisma.algorithmStatus.findMany({ where: { userId }, select: { algId: true, status: true } }),
    prisma.algorithmPb.findMany({ where: { userId }, select: { algId: true, moves: true, time: true } }),
    prisma.algorithmPref.findMany({ where: { userId }, select: { algId: true, note: true, primaryMoves: true } }),
  ])

  const statuses = Object.fromEntries(statusRows.map((r) => [r.algId, r.status]))
  const pbs = {}
  for (const r of pbRows) (pbs[r.algId] ??= {})[r.moves] = r.time
  // Jeden wiersz trzyma oba ustawienia — rozkładamy go na dwie mapy, pomijając puste pola.
  const notes = {}
  const primaryMoves = {}
  for (const r of prefRows) {
    if (r.note) notes[r.algId] = r.note
    if (r.primaryMoves) primaryMoves[r.algId] = r.primaryMoves
  }
  return { statuses, pbs, notes, primaryMoves }
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
 * Zapis jednego pola ustawień algorytmu (notatka ALBO wariant główny) — upsert
 * wiersza, drugie pole zostaje nietknięte. Nowy wiersz tylko w granicy limitu.
 */
async function upsertPref(userId, algId, data) {
  const exists = await prisma.algorithmPref.count({ where: { userId, algId } })
  if (!exists && (await prisma.algorithmPref.count({ where: { userId } })) >= MAX_PREFS) {
    throw httpError(409, 'Osiągnięto limit ustawień algorytmów.')
  }
  return prisma.algorithmPref.upsert({
    where: { userId_algId: { userId, algId } },
    create: { userId, algId, ...data },
    update: data,
    select: { algId: true, note: true, primaryMoves: true },
  })
}

/**
 * Notatka do algorytmu. Front wysyła CAŁY tekst (z opóźnieniem po pisaniu),
 * więc zapis to zwykłe nadpisanie. Pusty tekst = brak notatki (null).
 */
export async function setNote(userId, algId, note) {
  const value = note.trim() ? note : null
  const row = await upsertPref(userId, algId, { note: value })
  return { algId, note: row.note ?? '' }
}

/** „Ustaw jako główny" — sekwencja wybranego wariantu (front odcina już rotację). */
export async function setPrimary(userId, algId, moves) {
  const row = await upsertPref(userId, algId, { primaryMoves: moves })
  return { algId, moves: row.primaryMoves }
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
 *  - rekordy: zostaje lepszy z dwóch czasów,
 *  - notatki i wariant główny: uzupełniamy tylko puste pola (chmura wygrywa).
 * Nowe wpisy przycinamy do wolnego miejsca w limicie konta.
 */
export async function importProgress(userId, { statuses, pbs, notes = {}, primaryMoves = {} }) {
  const [statusRows, pbRows, prefRows] = await Promise.all([
    prisma.algorithmStatus.findMany({ where: { userId }, select: { algId: true } }),
    prisma.algorithmPb.findMany({ where: { userId }, select: { algId: true, moves: true, time: true } }),
    prisma.algorithmPref.findMany({ where: { userId }, select: { algId: true, note: true, primaryMoves: true } }),
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

  // — notatki i wariant główny: jeden wiersz na algorytm, oba pola opcjonalne —
  const cloudPref = new Map(prefRows.map((r) => [r.algId, r]))
  const incomingPref = new Map() // algId → pola, których w chmurze brakuje
  const fill = (field, map) => {
    for (const [algId, value] of Object.entries(map)) {
      if (cloudPref.get(algId)?.[field]) continue // chmura ma już swoją wartość
      incomingPref.set(algId, { ...incomingPref.get(algId), [field]: value })
    }
  }
  fill('note', notes)
  fill('primaryMoves', primaryMoves)
  const newPrefs = [...incomingPref]
    .filter(([algId]) => !cloudPref.has(algId))
    .slice(0, Math.max(0, MAX_PREFS - prefRows.length))
    .map(([algId, data]) => ({ userId, algId, ...data }))
  // Istniejący wiersz z pustym polem: dopisujemy warunkowo (`pole: null`), żeby
  // nie nadpisać wartości, którą inne urządzenie zapisało w międzyczasie.
  const fillPrefs = [...incomingPref]
    .filter(([algId]) => cloudPref.has(algId))
    .flatMap(([algId, data]) => Object.entries(data).map(([field, value]) => ({ algId, field, value })))

  // Jedna transakcja: import wchodzi w całości albo wcale.
  await prisma.$transaction([
    prisma.algorithmStatus.createMany({ data: newStatuses, skipDuplicates: true }),
    prisma.algorithmPb.createMany({ data: newPbs, skipDuplicates: true }),
    ...betterPbs.map(({ algId, moves, time }) =>
      prisma.algorithmPb.updateMany({ where: { userId, algId, moves, time: { gt: time } }, data: { time } }),
    ),
    prisma.algorithmPref.createMany({ data: newPrefs, skipDuplicates: true }),
    ...fillPrefs.map(({ algId, field, value }) =>
      prisma.algorithmPref.updateMany({ where: { userId, algId, [field]: null }, data: { [field]: value } }),
    ),
  ])

  return {
    statuses: newStatuses.length,
    pbs: newPbs.length + betterPbs.length,
    prefs: newPrefs.length + fillPrefs.length,
    progress: await getProgress(userId),
  }
}
