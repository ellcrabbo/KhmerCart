-- CreateEnum
CREATE TYPE "ProductModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "category" TEXT,
ADD COLUMN     "moderationNotes" TEXT,
ADD COLUMN     "moderationStatus" "ProductModerationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "sellerAddress" TEXT,
ADD COLUMN     "sellerContact" TEXT;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "currency" DROP NOT NULL,
ALTER COLUMN "priceMinor" DROP NOT NULL;

-- AddCheckConstraints
ALTER TABLE "Inventory"
ADD CONSTRAINT "Inventory_onHandQuantity_nonnegative" CHECK ("onHandQuantity" >= 0),
ADD CONSTRAINT "Inventory_reservedQuantity_nonnegative" CHECK ("reservedQuantity" >= 0),
ADD CONSTRAINT "Inventory_availableQuantity_nonnegative" CHECK ("availableQuantity" >= 0),
ADD CONSTRAINT "Inventory_availableQuantity_consistent" CHECK ("availableQuantity" = ("onHandQuantity" - "reservedQuantity"));

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductImage_productId_position_idx" ON "ProductImage"("productId", "position");

-- CreateIndex
CREATE INDEX "Product_sellerId_moderationStatus_idx" ON "Product"("sellerId", "moderationStatus");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_position_idx" ON "ProductVariant"("productId", "position");

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
