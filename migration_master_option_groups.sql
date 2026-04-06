-- Migration: Add MasterOptionGroup and MasterOption tables
-- These tables store option groups and options for MasterProducts (Central level)

-- Create MasterOptionGroup table
CREATE TABLE IF NOT EXISTS "MasterOptionGroup" (
    "id" TEXT NOT NULL,
    "masterProductId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "min" INTEGER NOT NULL DEFAULT 0,
    "max" INTEGER NOT NULL DEFAULT 1,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterOptionGroup_pkey" PRIMARY KEY ("id")
);

-- Create MasterOption table
CREATE TABLE IF NOT EXISTS "MasterOption" (
    "id" TEXT NOT NULL,
    "masterOptionGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceDelta" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterOption_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'MasterOptionGroup_masterProductId_fkey'
    ) THEN
        ALTER TABLE "MasterOptionGroup" ADD CONSTRAINT "MasterOptionGroup_masterProductId_fkey" 
            FOREIGN KEY ("masterProductId") REFERENCES "MasterProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'MasterOption_masterOptionGroupId_fkey'
    ) THEN
        ALTER TABLE "MasterOption" ADD CONSTRAINT "MasterOption_masterOptionGroupId_fkey" 
            FOREIGN KEY ("masterOptionGroupId") REFERENCES "MasterOptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "MasterOptionGroup_masterProductId_idx" ON "MasterOptionGroup"("masterProductId");
CREATE INDEX IF NOT EXISTS "MasterOptionGroup_sort_idx" ON "MasterOptionGroup"("sort");
CREATE INDEX IF NOT EXISTS "MasterOption_masterOptionGroupId_idx" ON "MasterOption"("masterOptionGroupId");
CREATE INDEX IF NOT EXISTS "MasterOption_sort_idx" ON "MasterOption"("sort");
CREATE INDEX IF NOT EXISTS "MasterOption_isActive_idx" ON "MasterOption"("isActive");

