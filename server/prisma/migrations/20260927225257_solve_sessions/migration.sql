-- AlterTable
ALTER TABLE "solves" ADD COLUMN     "sessionId" TEXT;

-- CreateTable
CREATE TABLE "solve_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solve_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "solve_sessions_userId_idx" ON "solve_sessions"("userId");

-- CreateIndex
CREATE INDEX "solves_sessionId_idx" ON "solves"("sessionId");

-- AddForeignKey
ALTER TABLE "solves" ADD CONSTRAINT "solves_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "solve_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solve_sessions" ADD CONSTRAINT "solve_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
