-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('SQUARE', 'STRIPE');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentProvider" "PaymentProvider" NOT NULL DEFAULT 'SQUARE',
ADD COLUMN     "pendingAccountHash" TEXT,
ADD COLUMN     "stripePaymentIntentId" TEXT,
ADD COLUMN     "stripeSessionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripeSessionId_key" ON "Order"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripePaymentIntentId_key" ON "Order"("stripePaymentIntentId");

