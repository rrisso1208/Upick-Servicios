-- Migration: Add category field to Place table
-- This migration adds a category field to distinguish between different types of places (Universidad, Centro Comercial, etc.)

-- Add category column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "category" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Create index for category if it doesn't exist
CREATE INDEX IF NOT EXISTS "Place_category_idx" ON "Place"("category");

