-- Migration: Add saleHoursStart and saleHoursEnd to Category table
-- Date: 2025-01-XX
-- Description: Adds optional time restrictions for category availability

-- Add saleHoursStart column (HH:MM format, e.g., "08:00")
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "saleHoursStart" TEXT;

-- Add saleHoursEnd column (HH:MM format, e.g., "11:00")
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "saleHoursEnd" TEXT;

-- Add comments for documentation
COMMENT ON COLUMN "Category"."saleHoursStart" IS 'Time in HH:MM format (24h) when category products become available. Example: "08:00" for 8 AM. NULL means available all day.';
COMMENT ON COLUMN "Category"."saleHoursEnd" IS 'Time in HH:MM format (24h) when category products stop being available. Example: "11:00" for 11 AM. NULL means available all day.';

