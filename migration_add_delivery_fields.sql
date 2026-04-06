-- Migration: Add deliveryInternalEnabled and deliveryFee to Restaurant table
-- This migration adds the fields needed for internal delivery configuration

-- Add deliveryInternalEnabled column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "deliveryInternalEnabled" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add deliveryFee column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "deliveryFee" INTEGER NOT NULL DEFAULT 0;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

