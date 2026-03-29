-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "businessDescription" TEXT,
ADD COLUMN     "payoutAccountName" TEXT,
ADD COLUMN     "payoutAccountNumber" TEXT,
ADD COLUMN     "payoutBankName" TEXT,
ADD COLUMN     "payoutRoutingNumber" TEXT;

-- CreateTable
CREATE TABLE "SellerDocument" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "uploadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SellerDocument_s3Key_key" ON "SellerDocument"("s3Key");

-- CreateIndex
CREATE INDEX "SellerDocument_sellerId_createdAt_idx" ON "SellerDocument"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "SellerDocument_sellerId_type_idx" ON "SellerDocument"("sellerId", "type");

-- AddForeignKey
ALTER TABLE "SellerDocument" ADD CONSTRAINT "SellerDocument_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;
