-- Migration: Add creditsUsed field to Order table
-- Run this in Supabase SQL Editor

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "creditsUsed" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Order_creditsUsed_idx" ON "Order"("creditsUsed");

