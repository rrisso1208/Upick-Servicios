-- Add wompiPaymentSourceId column to SavedPaymentMethod table
ALTER TABLE "SavedPaymentMethod" 
ADD COLUMN IF NOT EXISTS "wompiPaymentSourceId" TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "SavedPaymentMethod_wompiPaymentSourceId_idx" 
ON "SavedPaymentMethod"("wompiPaymentSourceId");

