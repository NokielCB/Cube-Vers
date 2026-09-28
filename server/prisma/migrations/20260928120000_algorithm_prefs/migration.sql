-- CreateTable
CREATE TABLE "algorithm_prefs" (
    "userId" TEXT NOT NULL,
    "algId" TEXT NOT NULL,
    "primaryMoves" TEXT,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "algorithm_prefs_pkey" PRIMARY KEY ("userId","algId")
);

-- AddForeignKey
ALTER TABLE "algorithm_prefs" ADD CONSTRAINT "algorithm_prefs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

