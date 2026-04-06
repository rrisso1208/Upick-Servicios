-- Migration: Add ServiceMode enum and update Order table
-- This migration adds the ServiceMode enum and ensures Order table has all necessary fields

-- Create ServiceMode enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "ServiceMode" AS ENUM ('eat_in', 'takeaway', 'internal_delivery');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Ensure Order table has serviceMode column (should already exist from previous migrations)
-- If not, add it
DO $$ BEGIN
    ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "serviceMode" "ServiceMode" DEFAULT 'takeaway';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Ensure Order table has deliveryPointId column (should already exist)
DO $$ BEGIN
    ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryPointId" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Ensure Order table has deliveryCost column (should already exist)
DO $$ BEGIN
    ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryCost" INTEGER NOT NULL DEFAULT 0;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Ensure Order table has customerPhone column (should already exist)
DO $$ BEGIN
    ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Create DeliveryPoint table if it doesn't exist
CREATE TABLE IF NOT EXISTS "DeliveryPoint" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DeliveryPoint_pkey" PRIMARY KEY ("id")
);

-- Create indexes for DeliveryPoint if they don't exist
CREATE INDEX IF NOT EXISTS "DeliveryPoint_placeId_idx" ON "DeliveryPoint"("placeId");
CREATE INDEX IF NOT EXISTS "DeliveryPoint_isActive_idx" ON "DeliveryPoint"("isActive");
CREATE INDEX IF NOT EXISTS "DeliveryPoint_category_idx" ON "DeliveryPoint"("category");

-- Add foreign key from DeliveryPoint to Place if Place table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Place') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'DeliveryPoint_placeId_fkey'
        ) THEN
            ALTER TABLE "DeliveryPoint" ADD CONSTRAINT "DeliveryPoint_placeId_fkey" 
                FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- Add foreign key constraint for deliveryPointId if it doesn't exist
-- Only add if DeliveryPoint table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'DeliveryPoint') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'Order_deliveryPointId_fkey'
        ) THEN
            ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveryPointId_fkey" 
                FOREIGN KEY ("deliveryPointId") REFERENCES "DeliveryPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- Add index for serviceMode if it doesn't exist
CREATE INDEX IF NOT EXISTS "Order_serviceMode_idx" ON "Order"("serviceMode");

