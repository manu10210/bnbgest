-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('CLEANING', 'MAINTENANCE', 'UTILITIES', 'INSURANCE', 'TAX', 'MORTGAGE', 'FURNITURE', 'SUPPLIES', 'MARKETING', 'MANAGEMENT', 'RENOVATION', 'SUBSCRIPTION', 'OTHER');

-- CreateEnum
CREATE TYPE "InspectionType" AS ENUM ('CHECKIN', 'CHECKOUT', 'PERIODIC');

-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'SIGNED');

-- CreateEnum
CREATE TYPE "AccessCodeType" AS ENUM ('DOOR_CODE', 'KEY_BOX', 'SMART_LOCK', 'WIFI', 'PARKING', 'GATE', 'OTHER');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "confirmationCode" TEXT,
ADD COLUMN     "externalSource" TEXT,
ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "integration_settings" ADD COLUMN     "accessToken" TEXT,
ADD COLUMN     "refreshToken" TEXT,
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "cleaningFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalSource" TEXT,
ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "maxGuests" INTEGER,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "pricePerNight" DOUBLE PRECISION,
ADD COLUMN     "type" TEXT,
ADD COLUMN     "zipCode" TEXT;

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_credentials" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "category" "ExpenseCategory" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "vendor" TEXT,
    "receiptUrl" TEXT,
    "paymentMethod" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_inspections" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "bookingId" INTEGER,
    "type" "InspectionType" NOT NULL,
    "status" "InspectionStatus" NOT NULL DEFAULT 'DRAFT',
    "date" TIMESTAMP(3) NOT NULL,
    "inspector" TEXT,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "notes" TEXT,
    "signature" TEXT,
    "signedAt" TIMESTAMP(3),
    "rooms" JSONB,
    "globalScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_codes" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "bookingId" INTEGER,
    "label" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "AccessCodeType" NOT NULL DEFAULT 'DOOR_CODE',
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sentByEmail" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_threads" (
    "id" SERIAL NOT NULL,
    "platform" TEXT NOT NULL,
    "externalId" TEXT,
    "propertyId" INTEGER,
    "bookingId" INTEGER,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT,
    "subject" TEXT,
    "lastMessage" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "autoReplied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" SERIAL NOT NULL,
    "threadId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "senderName" TEXT,
    "isAI" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "web_vitals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "rating" TEXT NOT NULL,
    "page" TEXT,
    "userId" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "web_vitals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_email_idx" ON "password_reset_tokens"("email");

-- CreateIndex
CREATE UNIQUE INDEX "app_credentials_email_key" ON "app_credentials"("email");

-- CreateIndex
CREATE INDEX "expenses_propertyId_idx" ON "expenses"("propertyId");

-- CreateIndex
CREATE INDEX "expenses_category_idx" ON "expenses"("category");

-- CreateIndex
CREATE INDEX "expenses_date_idx" ON "expenses"("date");

-- CreateIndex
CREATE INDEX "property_inspections_propertyId_idx" ON "property_inspections"("propertyId");

-- CreateIndex
CREATE INDEX "property_inspections_bookingId_idx" ON "property_inspections"("bookingId");

-- CreateIndex
CREATE INDEX "property_inspections_type_idx" ON "property_inspections"("type");

-- CreateIndex
CREATE INDEX "access_codes_propertyId_idx" ON "access_codes"("propertyId");

-- CreateIndex
CREATE INDEX "access_codes_bookingId_idx" ON "access_codes"("bookingId");

-- CreateIndex
CREATE INDEX "message_threads_platform_idx" ON "message_threads"("platform");

-- CreateIndex
CREATE INDEX "message_threads_propertyId_idx" ON "message_threads"("propertyId");

-- CreateIndex
CREATE INDEX "message_threads_isRead_idx" ON "message_threads"("isRead");

-- CreateIndex
CREATE INDEX "message_threads_lastMessageAt_idx" ON "message_threads"("lastMessageAt");

-- CreateIndex
CREATE INDEX "messages_threadId_idx" ON "messages"("threadId");

-- CreateIndex
CREATE INDEX "web_vitals_name_idx" ON "web_vitals"("name");

-- CreateIndex
CREATE INDEX "web_vitals_timestamp_idx" ON "web_vitals"("timestamp");

-- CreateIndex
CREATE INDEX "web_vitals_page_idx" ON "web_vitals"("page");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_inspections" ADD CONSTRAINT "property_inspections_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_codes" ADD CONSTRAINT "access_codes_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
