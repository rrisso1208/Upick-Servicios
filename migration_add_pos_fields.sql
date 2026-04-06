-- Migration: Add POS integration fields to Restaurant table
-- This migration adds fields for POS (Point of Sale) integration

-- Add POS type field (enum-like string)
ALTER TABLE "Restaurant" 
ADD COLUMN IF NOT EXISTS "posType" TEXT;

-- Add POS enabled flag
ALTER TABLE "Restaurant" 
ADD COLUMN IF NOT EXISTS "posEnabled" BOOLEAN DEFAULT false;

-- Add POS credentials (JSON field to store API keys, tokens, etc.)
ALTER TABLE "Restaurant" 
ADD COLUMN IF NOT EXISTS "posCredentials" JSONB;

-- Add last POS test timestamp
ALTER TABLE "Restaurant" 
ADD COLUMN IF NOT EXISTS "posLastTestAt" TIMESTAMP(3);

-- Add last POS test result (JSON field)
ALTER TABLE "Restaurant" 
ADD COLUMN IF NOT EXISTS "posLastTestResult" JSONB;

-- Add index for POS enabled restaurants (for filtering)
CREATE INDEX IF NOT EXISTS "Restaurant_posEnabled_idx" ON "Restaurant"("posEnabled");

-- Add index for POS type (for filtering by POS type)
CREATE INDEX IF NOT EXISTS "Restaurant_posType_idx" ON "Restaurant"("posType");

-- Add comment to document the fields
COMMENT ON COLUMN "Restaurant"."posType" IS 'Tipo de POS: toteat, softrestaurant, micros, simphony, chevyprest, binda, frisbypos, restaurantepos';
COMMENT ON COLUMN "Restaurant"."posEnabled" IS 'Indica si la integración POS está habilitada';
COMMENT ON COLUMN "Restaurant"."posCredentials" IS 'Credenciales del POS (API keys, tokens, etc.) en formato JSON';
COMMENT ON COLUMN "Restaurant"."posLastTestAt" IS 'Fecha y hora del último test de conexión POS';
COMMENT ON COLUMN "Restaurant"."posLastTestResult" IS 'Resultado del último test de conexión POS en formato JSON';




