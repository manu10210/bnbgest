-- CreateTable
CREATE TABLE "guest_profiles" (
    "id" SERIAL NOT NULL,
    "userId" TEXT,
    "identityKey" TEXT NOT NULL,
    "emailNormalized" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "language" TEXT NOT NULL DEFAULT 'fr',
    "nationality" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "totalBookings" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastBooking" TIMESTAMP(3),
    "preferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guest_profiles_identityKey_key" ON "guest_profiles"("identityKey");

-- CreateIndex
CREATE INDEX "guest_profiles_userId_idx" ON "guest_profiles"("userId");

-- CreateIndex
CREATE INDEX "guest_profiles_emailNormalized_idx" ON "guest_profiles"("emailNormalized");

-- CreateIndex
CREATE INDEX "guest_profiles_status_idx" ON "guest_profiles"("status");

-- AddForeignKey
ALTER TABLE "guest_profiles" ADD CONSTRAINT "guest_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
