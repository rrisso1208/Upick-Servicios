-- ============================================
-- MIGRACIÓN: Sistema de Centrales y Franquicias
-- ============================================
-- Esta migración agrega soporte para gestión de cadenas (1:N)
-- con menú centralizado y control jerárquico

-- 1. Agregar central_admin al enum Role
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'central_admin' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')) THEN
        ALTER TYPE "Role" ADD VALUE 'central_admin';
    END IF;
END $$;

-- 2. Crear tabla Central
CREATE TABLE IF NOT EXISTS "Central" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "commissionPercentage" DECIMAL(5, 2) NOT NULL DEFAULT 5.0,
    "freeFeeThreshold" INTEGER NOT NULL DEFAULT 0,
    "lowOrderFee" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Central_pkey" PRIMARY KEY ("id")
);

-- Índices para Central
CREATE INDEX IF NOT EXISTS "Central_name_idx" ON "Central"("name");
CREATE INDEX IF NOT EXISTS "Central_isActive_idx" ON "Central"("isActive");

-- 3. Agregar centralId a Restaurant
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "centralId" TEXT;
CREATE INDEX IF NOT EXISTS "Restaurant_centralId_idx" ON "Restaurant"("centralId");

-- Foreign key de Restaurant a Central
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Central') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'Restaurant_centralId_fkey'
        ) THEN
            ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_centralId_fkey"
                FOREIGN KEY ("centralId") REFERENCES "Central"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- 4. Agregar centralId a User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "centralId" TEXT;
CREATE INDEX IF NOT EXISTS "User_centralId_idx" ON "User"("centralId");

-- Foreign key de User a Central
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Central') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'User_centralId_fkey'
        ) THEN
            ALTER TABLE "User" ADD CONSTRAINT "User_centralId_fkey"
                FOREIGN KEY ("centralId") REFERENCES "Central"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- 5. Crear tabla MasterProduct
CREATE TABLE IF NOT EXISTS "MasterProduct" (
    "id" TEXT NOT NULL,
    "centralId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "imagePosition" TEXT NOT NULL DEFAULT 'center',
    "imageScale" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "sku" TEXT,
    "basePrice" INTEGER NOT NULL,
    "isGloballyAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MasterProduct_pkey" PRIMARY KEY ("id")
);

-- Índices para MasterProduct
CREATE UNIQUE INDEX IF NOT EXISTS "MasterProduct_sku_key" ON "MasterProduct"("sku");
CREATE INDEX IF NOT EXISTS "MasterProduct_centralId_idx" ON "MasterProduct"("centralId");
CREATE INDEX IF NOT EXISTS "MasterProduct_sku_idx" ON "MasterProduct"("sku");
CREATE INDEX IF NOT EXISTS "MasterProduct_isGloballyAvailable_idx" ON "MasterProduct"("isGloballyAvailable");

-- Foreign key de MasterProduct a Central
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Central') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'MasterProduct_centralId_fkey'
        ) THEN
            ALTER TABLE "MasterProduct" ADD CONSTRAINT "MasterProduct_centralId_fkey"
                FOREIGN KEY ("centralId") REFERENCES "Central"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- 6. Crear tabla BranchProduct
CREATE TABLE IF NOT EXISTS "BranchProduct" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "masterProductId" TEXT NOT NULL,
    "localPrice" INTEGER,
    "isLocallyActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BranchProduct_pkey" PRIMARY KEY ("id")
);

-- Constraint único para evitar duplicados
CREATE UNIQUE INDEX IF NOT EXISTS "BranchProduct_restaurantId_masterProductId_key" 
    ON "BranchProduct"("restaurantId", "masterProductId");

-- Índices para BranchProduct
CREATE INDEX IF NOT EXISTS "BranchProduct_restaurantId_idx" 
    ON "BranchProduct"("restaurantId");
CREATE INDEX IF NOT EXISTS "BranchProduct_masterProductId_idx" 
    ON "BranchProduct"("masterProductId");
CREATE INDEX IF NOT EXISTS "BranchProduct_isLocallyActive_idx" 
    ON "BranchProduct"("isLocallyActive");

-- Foreign keys de BranchProduct
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Restaurant') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'BranchProduct_restaurantId_fkey'
        ) THEN
            ALTER TABLE "BranchProduct" ADD CONSTRAINT "BranchProduct_restaurantId_fkey"
                FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'MasterProduct') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'BranchProduct_masterProductId_fkey'
        ) THEN
            ALTER TABLE "BranchProduct" ADD CONSTRAINT "BranchProduct_masterProductId_fkey"
                FOREIGN KEY ("masterProductId") REFERENCES "MasterProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

