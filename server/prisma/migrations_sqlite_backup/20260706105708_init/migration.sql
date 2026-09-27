-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "solves" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "time" INTEGER NOT NULL,
    "scramble" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OK',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duelId" TEXT,
    CONSTRAINT "solves_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "solves_duelId_fkey" FOREIGN KEY ("duelId") REFERENCES "duels" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "duels" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomCode" TEXT NOT NULL,
    "scramble" TEXT NOT NULL,
    "winnerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "duel_players" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "duelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "time" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OK',
    CONSTRAINT "duel_players_duelId_fkey" FOREIGN KEY ("duelId") REFERENCES "duels" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "duel_players_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "solves_userId_createdAt_idx" ON "solves"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "solves_duelId_idx" ON "solves"("duelId");

-- CreateIndex
CREATE UNIQUE INDEX "duel_players_duelId_userId_key" ON "duel_players"("duelId", "userId");
