-- Migration: Agregar tabla MenuSyncHistory para historial de sincronizaciones
-- Fecha: 2024-01-XX
-- Descripción: Tabla para guardar historial de sincronizaciones de menú desde POS

CREATE TABLE IF NOT EXISTS "MenuSyncHistory" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "restaurantId" TEXT NOT NULL,
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "importedCategories" INTEGER NOT NULL DEFAULT 0,
  "importedProducts" INTEGER NOT NULL DEFAULT 0,
  "updatedCategories" INTEGER NOT NULL DEFAULT 0,
  "updatedProducts" INTEGER NOT NULL DEFAULT 0,
  "errors" JSONB,
  "changes" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MenuSyncHistory_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS "MenuSyncHistory_restaurantId_idx" ON "MenuSyncHistory" ("restaurantId");
CREATE INDEX IF NOT EXISTS "MenuSyncHistory_syncedAt_idx" ON "MenuSyncHistory" ("syncedAt");
CREATE INDEX IF NOT EXISTS "MenuSyncHistory_createdAt_idx" ON "MenuSyncHistory" ("createdAt");

-- Comentarios para documentación
COMMENT ON TABLE "MenuSyncHistory" IS 'Historial de sincronizaciones de menú desde POS';
COMMENT ON COLUMN "MenuSyncHistory"."syncedAt" IS 'Fecha y hora de la sincronización';
COMMENT ON COLUMN "MenuSyncHistory"."importedCategories" IS 'Número de categorías importadas';
COMMENT ON COLUMN "MenuSyncHistory"."importedProducts" IS 'Número de productos importados';
COMMENT ON COLUMN "MenuSyncHistory"."updatedCategories" IS 'Número de categorías actualizadas';
COMMENT ON COLUMN "MenuSyncHistory"."updatedProducts" IS 'Número de productos actualizados';
COMMENT ON COLUMN "MenuSyncHistory"."errors" IS 'Array de errores si los hay';
COMMENT ON COLUMN "MenuSyncHistory"."changes" IS 'Detalles de cambios (precios, inventario, etc.)';



