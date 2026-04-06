-- Add consentToSavePaymentMethod column to Order table (Ley 1581 de 2012 compliance)
ALTER TABLE "Order" 
ADD COLUMN IF NOT EXISTS "consentToSavePaymentMethod" BOOLEAN NOT NULL DEFAULT false;

