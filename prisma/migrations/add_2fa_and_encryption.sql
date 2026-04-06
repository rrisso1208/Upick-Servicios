-- Migration: Add 2FA and encryption support
-- This migration adds fields for 2FA and prepares for encrypted data

-- Add 2FA fields to User table
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "twoFactorSecret" TEXT,
ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "twoFactorBackupCodes" TEXT[];

-- Add index for 2FA enabled users
CREATE INDEX IF NOT EXISTS "User_twoFactorEnabled_idx" ON "User"("twoFactorEnabled");

-- Note: InvoiceData fields will be encrypted at application level
-- No schema changes needed as encryption is transparent to the database

-- Note: Order.pickupCode will be hashed at application level
-- The field remains as TEXT but will store hashed values for new orders

