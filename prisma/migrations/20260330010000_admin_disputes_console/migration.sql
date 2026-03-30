CREATE TYPE "DisputeReason" AS ENUM ('NOT_RECEIVED', 'DAMAGED', 'NOT_AS_DESCRIBED', 'OTHER');

CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'REFUND_APPROVED', 'REJECTED', 'CLOSED');

CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "reason" "DisputeReason" NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "buyerMessage" TEXT NOT NULL,
    "sellerResponse" TEXT,
    "adminNote" TEXT,
    "resolutionNote" TEXT,
    "requestedRefundMinor" INTEGER,
    "resolvedRefundMinor" INTEGER,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Dispute_orderId_idx" ON "Dispute"("orderId");

CREATE INDEX "Dispute_status_createdAt_idx" ON "Dispute"("status", "createdAt");

ALTER TABLE "Dispute"
ADD CONSTRAINT "Dispute_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
