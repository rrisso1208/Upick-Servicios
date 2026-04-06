-- ════════════════════════════════════════════════════════════
-- MIGRACIÓN: Crear tabla MasterCategory y FK en MasterProduct
-- ════════════════════════════════════════════════════════════

-- 1. Crear tabla de categorías maestras
CREATE TABLE IF NOT EXISTS "MasterCategory" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "centralId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "saleHoursStart" TEXT,
  "saleHoursEnd" TEXT,
  "sort" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. FK a Central
ALTER TABLE "MasterCategory"
ADD CONSTRAINT "MasterCategory_centralId_fkey"
FOREIGN KEY ("centralId") REFERENCES "Central"("id") ON DELETE CASCADE;

-- 3. Column masterCategoryId en MasterProduct
ALTER TABLE "MasterProduct"
ADD COLUMN IF NOT EXISTS "masterCategoryId" TEXT;

ALTER TABLE "MasterProduct"
ADD CONSTRAINT "MasterProduct_masterCategoryId_fkey"
FOREIGN KEY ("masterCategoryId") REFERENCES "MasterCategory"("id") ON DELETE SET NULL;

-- 4. Índices
CREATE INDEX IF NOT EXISTS "MasterCategory_centralId_idx"
ON "MasterCategory" ("centralId");

CREATE INDEX IF NOT EXISTS "MasterCategory_sort_idx"
ON "MasterCategory" ("centralId", "sort");

CREATE INDEX IF NOT EXISTS "MasterProduct_masterCategoryId_idx"
ON "MasterProduct" ("masterCategoryId");


