-- CreateEnum
CREATE TYPE "ShipmentEventSource" AS ENUM ('MANUAL', 'PROVIDER', 'SYSTEM');

-- AlterEnum
ALTER TYPE "OrderEventType" ADD VALUE 'HANDED_TO_CARRIER';

-- AlterEnum
ALTER TYPE "OrderState" ADD VALUE 'HANDED_TO_CARRIER';

-- AlterEnum
ALTER TYPE "ShipmentStatus" ADD VALUE 'HANDED_TO_CARRIER';

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "providerShipmentId" TEXT;

-- CreateTable
CREATE TABLE "ShipmentEvent" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "source" "ShipmentEventSource" NOT NULL DEFAULT 'MANUAL',
    "status" "ShipmentStatus" NOT NULL,
    "message" TEXT,
    "providerEventId" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShipmentEvent_shipmentId_occurredAt_idx" ON "ShipmentEvent"("shipmentId", "occurredAt");

-- CreateIndex
CREATE INDEX "ShipmentEvent_actorUserId_createdAt_idx" ON "ShipmentEvent"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ShipmentEvent_providerEventId_idx" ON "ShipmentEvent"("providerEventId");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_providerShipmentId_key" ON "Shipment"("providerShipmentId");

-- AddForeignKey
ALTER TABLE "ShipmentEvent" ADD CONSTRAINT "ShipmentEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentEvent" ADD CONSTRAINT "ShipmentEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
