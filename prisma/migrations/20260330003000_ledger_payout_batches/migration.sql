-- CreateEnum
CREATE TYPE "SellerRiskTier" AS ENUM ('LOW', 'MED', 'HIGH');

-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "riskTier" "SellerRiskTier" NOT NULL DEFAULT 'MED';

-- CreateTable
CREATE TABLE "PayoutItem" (
    "id" TEXT NOT NULL,
    "payoutBatchId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "orderId" TEXT,
    "ledgerEntryId" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "grossAmountMinor" INTEGER NOT NULL,
    "feeAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "netAmountMinor" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayoutItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PayoutItem_ledgerEntryId_key" ON "PayoutItem"("ledgerEntryId");

-- CreateIndex
CREATE INDEX "PayoutItem_payoutBatchId_createdAt_idx" ON "PayoutItem"("payoutBatchId", "createdAt");

-- CreateIndex
CREATE INDEX "PayoutItem_sellerId_createdAt_idx" ON "PayoutItem"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "PayoutItem_orderId_idx" ON "PayoutItem"("orderId");

-- AddForeignKey
ALTER TABLE "PayoutItem" ADD CONSTRAINT "PayoutItem_payoutBatchId_fkey" FOREIGN KEY ("payoutBatchId") REFERENCES "PayoutBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutItem" ADD CONSTRAINT "PayoutItem_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutItem" ADD CONSTRAINT "PayoutItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutItem" ADD CONSTRAINT "PayoutItem_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "LedgerEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
