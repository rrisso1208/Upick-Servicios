-- ════════════════════════════════════════════════════════════
-- MIGRACIÓN: Extender MasterProduct y BranchProduct para Menú Maestro
-- ════════════════════════════════════════════════════════════

-- 1. Campos nuevos en MasterProduct
ALTER TABLE "MasterProduct"
ADD COLUMN IF NOT EXISTS "categoryName" TEXT,
ADD COLUMN IF NOT EXISTS "categorySort" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "saleHoursStart" TEXT,
ADD COLUMN IF NOT EXISTS "saleHoursEnd" TEXT,
ADD COLUMN IF NOT EXISTS "promotionPrice" INTEGER,
ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "prepMinutes" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS "specs" JSONB;

-- 2. Campos nuevos en BranchProduct (overrides locales)
ALTER TABLE "BranchProduct"
ADD COLUMN IF NOT EXISTS "localPromotionPrice" INTEGER,
ADD COLUMN IF NOT EXISTS "localIsFeatured" BOOLEAN,
ADD COLUMN IF NOT EXISTS "localPrepMinutes" INTEGER,
ADD COLUMN IF NOT EXISTS "localSpecs" JSONB;

-- 3. Índices opcionales para filtros futuros
CREATE INDEX IF NOT EXISTS "MasterProduct_categorySort_idx"
ON "MasterProduct" ("centralId", "categorySort");

CREATE INDEX IF NOT EXISTS "MasterProduct_isFeatured_idx"
ON "MasterProduct" ("centralId", "isFeatured");


