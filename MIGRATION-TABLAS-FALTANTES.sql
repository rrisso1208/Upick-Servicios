-- MIGRACIÓN: Crear tablas faltantes para productos
-- Ejecuta este script en Supabase SQL Editor si faltan tablas relacionadas

-- Crear tabla ProductOptionGroup
CREATE TABLE IF NOT EXISTS "ProductOptionGroup" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "min" INTEGER NOT NULL DEFAULT 0,
    "max" INTEGER NOT NULL DEFAULT 1,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductOptionGroup_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProductOptionGroup_productId_idx" ON "ProductOptionGroup"("productId");

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProductOptionGroup_productId_fkey') THEN
        ALTER TABLE "ProductOptionGroup" ADD CONSTRAINT "ProductOptionGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Crear tabla ProductOption
CREATE TABLE IF NOT EXISTS "ProductOption" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceDelta" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductOption_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProductOption_groupId_idx" ON "ProductOption"("groupId");

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProductOption_groupId_fkey') THEN
        ALTER TABLE "ProductOption" ADD CONSTRAINT "ProductOption_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ProductOptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Crear tabla Badge
CREATE TABLE IF NOT EXISTS "Badge" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Badge_isActive_idx" ON "Badge"("isActive");
CREATE INDEX IF NOT EXISTS "Badge_sort_idx" ON "Badge"("sort");

-- Crear tabla ProductBadge
CREATE TABLE IF NOT EXISTS "ProductBadge" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductBadge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProductBadge_productId_idx" ON "ProductBadge"("productId");
CREATE INDEX IF NOT EXISTS "ProductBadge_badgeId_idx" ON "ProductBadge"("badgeId");

CREATE UNIQUE INDEX IF NOT EXISTS "ProductBadge_productId_badgeId_key" ON "ProductBadge"("productId", "badgeId");

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProductBadge_productId_fkey') THEN
        ALTER TABLE "ProductBadge" ADD CONSTRAINT "ProductBadge_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProductBadge_badgeId_fkey') THEN
        ALTER TABLE "ProductBadge" ADD CONSTRAINT "ProductBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Verificar que se crearon correctamente
SELECT 
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('ProductOptionGroup', 'ProductOption', 'Badge', 'ProductBadge')
ORDER BY table_name;

