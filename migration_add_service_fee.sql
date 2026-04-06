-- Migration: Add Service Fee fields to Restaurant and Order tables
-- This migration adds support for service fees on low-value orders

-- Add service fee configuration fields to Restaurant table
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "freeFeeThreshold" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "lowOrderFee" INTEGER NOT NULL DEFAULT 0;

-- Add service fee amount to Order table
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "serviceFeeAmount" INTEGER NOT NULL DEFAULT 0;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "Restaurant_freeFeeThreshold_idx" ON "Restaurant"("freeFeeThreshold");
CREATE INDEX IF NOT EXISTS "Order_serviceFeeAmount_idx" ON "Order"("serviceFeeAmount");

-- Add comments for documentation
COMMENT ON COLUMN "Restaurant"."freeFeeThreshold" IS 'Monto mínimo del pedido para que el service fee sea gratis (en centavos)';
COMMENT ON COLUMN "Restaurant"."lowOrderFee" IS 'Costo del service fee si no se cumple el mínimo (en centavos)';
COMMENT ON COLUMN "Order"."serviceFeeAmount" IS 'Costo de servicio cobrado en esta orden (en centavos)';
