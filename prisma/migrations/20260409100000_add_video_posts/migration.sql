CREATE TYPE "VideoPostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "VideoPost" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "videoKey" TEXT NOT NULL,
    "posterKey" TEXT,
    "durationSec" INTEGER,
    "aspectRatio" DOUBLE PRECISION,
    "status" "VideoPostStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoPost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VideoPost_videoKey_key" ON "VideoPost"("videoKey");
CREATE INDEX "VideoPost_sellerId_status_idx" ON "VideoPost"("sellerId", "status");
CREATE INDEX "VideoPost_publishedAt_id_idx" ON "VideoPost"("publishedAt", "id");
CREATE INDEX "VideoPost_productId_status_idx" ON "VideoPost"("productId", "status");

ALTER TABLE "VideoPost"
ADD CONSTRAINT "VideoPost_sellerId_fkey"
FOREIGN KEY ("sellerId") REFERENCES "Seller"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VideoPost"
ADD CONSTRAINT "VideoPost_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
