-- CreateTable
CREATE TABLE "algorithm_statuses" (
    "userId" TEXT NOT NULL,
    "algId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "algorithm_statuses_pkey" PRIMARY KEY ("userId","algId")
);

-- CreateTable
CREATE TABLE "algorithm_pbs" (
    "userId" TEXT NOT NULL,
    "algId" TEXT NOT NULL,
    "moves" TEXT NOT NULL,
    "time" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "algorithm_pbs_pkey" PRIMARY KEY ("userId","algId","moves")
);

-- AddForeignKey
ALTER TABLE "algorithm_statuses" ADD CONSTRAINT "algorithm_statuses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "algorithm_pbs" ADD CONSTRAINT "algorithm_pbs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

