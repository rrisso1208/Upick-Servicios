-- Migration: Agregar campos para integración POS en menú híbrido
-- Fecha: 2024-01-XX
-- Descripción: Agrega campos para soportar menú híbrido (POS como fuente + personalización visual)

-- Crear enum MenuSource si no existe
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MenuSource') THEN
        CREATE TYPE "MenuSource" AS ENUM ('POS', 'MANUAL');
    END IF;
END $$;

-- Agregar campos a Category
ALTER TABLE "Category" 
  ADD COLUMN IF NOT EXISTS "posCategoryId" TEXT,
  ADD COLUMN IF NOT EXISTS "displayName" TEXT,
  ADD COLUMN IF NOT EXISTS "menuSource" "MenuSource" DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "posLastSyncedAt" TIMESTAMP(3);

-- Agregar campos a Product
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "posItemId" TEXT,
  ADD COLUMN IF NOT EXISTS "displayName" TEXT,
  ADD COLUMN IF NOT EXISTS "menuSource" "MenuSource" DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "posLastSyncedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "posPrice" INTEGER,
  ADD COLUMN IF NOT EXISTS "posInventoryQuantity" INTEGER;

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS "Category_posCategoryId_idx" ON "Category" ("posCategoryId");
CREATE INDEX IF NOT EXISTS "Category_menuSource_idx" ON "Category" ("menuSource");
CREATE INDEX IF NOT EXISTS "Product_posItemId_idx" ON "Product" ("posItemId");
CREATE INDEX IF NOT EXISTS "Product_menuSource_idx" ON "Product" ("menuSource");

-- Comentarios para documentación
COMMENT ON COLUMN "Category"."posCategoryId" IS 'ID de la categoría en el sistema POS';
COMMENT ON COLUMN "Category"."displayName" IS 'Nombre comercial personalizado para visualización';
COMMENT ON COLUMN "Category"."menuSource" IS 'Fuente del menú: POS (importado) o MANUAL (creado en YouPick)';
COMMENT ON COLUMN "Category"."posLastSyncedAt" IS 'Última vez que se sincronizó desde POS';

COMMENT ON COLUMN "Product"."posItemId" IS 'ID del item en el sistema POS (crítico para envío de pedidos)';
COMMENT ON COLUMN "Product"."displayName" IS 'Nombre comercial personalizado para visualización';
COMMENT ON COLUMN "Product"."menuSource" IS 'Fuente del menú: POS (importado) o MANUAL (creado en YouPick)';
COMMENT ON COLUMN "Product"."posLastSyncedAt" IS 'Última vez que se sincronizó desde POS';
COMMENT ON COLUMN "Product"."posPrice" IS 'Precio desde POS (para comparación y sincronización)';
COMMENT ON COLUMN "Product"."posInventoryQuantity" IS 'Inventario desde POS (si el POS maneja inventario)';



