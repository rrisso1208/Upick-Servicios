-- Add inventory management fields to Product table (if not exists)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "inventoryEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "inventoryQuantity" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "inventoryAlertThreshold" INTEGER;

-- Create index for inventoryEnabled (if not exists)
CREATE INDEX IF NOT EXISTS "Product_inventoryEnabled_idx" ON "Product"("inventoryEnabled");

-- Add INVENTORY_LOW to NotificationType enum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'INVENTORY_LOW';

-- Add userId field to Notification table (if not exists)
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "userId" TEXT;
CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");

-- Create InventoryAlert table (if not exists)
CREATE TABLE IF NOT EXISTS "InventoryAlert" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "currentQuantity" INTEGER NOT NULL,
    "threshold" INTEGER NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryAlert_pkey" PRIMARY KEY ("id")
);

-- Create indexes (if not exists)
CREATE INDEX IF NOT EXISTS "InventoryAlert_productId_idx" ON "InventoryAlert"("productId");
CREATE INDEX IF NOT EXISTS "InventoryAlert_restaurantId_idx" ON "InventoryAlert"("restaurantId");
CREATE INDEX IF NOT EXISTS "InventoryAlert_isResolved_idx" ON "InventoryAlert"("isResolved");
CREATE INDEX IF NOT EXISTS "InventoryAlert_createdAt_idx" ON "InventoryAlert"("createdAt");

-- Create unique partial index to prevent multiple unresolved alerts for the same product
-- This ensures only one active (unresolved) alert exists per product
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryAlert_productId_unresolved_unique" 
ON "InventoryAlert"("productId") 
WHERE "isResolved" = false;

-- Add foreign key constraint (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'InventoryAlert_productId_fkey'
    ) THEN
        ALTER TABLE "InventoryAlert" 
        ADD CONSTRAINT "InventoryAlert_productId_fkey" 
        FOREIGN KEY ("productId") 
        REFERENCES "Product"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
    END IF;
END $$;

-- Add foreign key constraint for restaurantId (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'InventoryAlert_restaurantId_fkey'
    ) THEN
        ALTER TABLE "InventoryAlert" 
        ADD CONSTRAINT "InventoryAlert_restaurantId_fkey" 
        FOREIGN KEY ("restaurantId") 
        REFERENCES "Restaurant"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
    END IF;
END $$;

