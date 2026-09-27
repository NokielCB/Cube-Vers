-- Friends System & Real-Time Challenges
-- 1) Dodaj kolumnę `username` do users. SQLite nie pozwala dodać kolumny z
--    inline UNIQUE przez ALTER TABLE, więc dodajemy zwykłą kolumnę, a unikalność
--    wymuszamy osobnym unikalnym indeksem (dopuszcza wiele NULL-i = stare konta).
ALTER TABLE "users" ADD COLUMN "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- 2) Tabela znajomości
-- CreateTable
CREATE TABLE "friendships" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "friendships_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "friendships_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "friendships_senderId_receiverId_key" ON "friendships"("senderId", "receiverId");

-- CreateIndex
CREATE INDEX "friendships_receiverId_idx" ON "friendships"("receiverId");

-- CreateIndex
CREATE INDEX "friendships_senderId_idx" ON "friendships"("senderId");
