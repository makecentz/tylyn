-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('NEW', 'CONTACTED', 'BOOKED', 'CLOSED');

-- CreateTable
CREATE TABLE "QuoteRequest" (
    "id" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'NEW',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "eventDate" DATE,
    "services" TEXT[],
    "guestCount" INTEGER,
    "details" TEXT NOT NULL DEFAULT '',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteRequest_pkey" PRIMARY KEY ("id")
);

