-- ════════════════════════════════════════════════════════════
-- MIGRACIÓN: Agregar campo bannerUrl a Restaurant
-- ════════════════════════════════════════════════════════════
-- Esta migración agrega el campo bannerUrl a la tabla Restaurant
-- para permitir que los restaurantes hereden banners de su Central

-- 1. Agregar columna bannerUrl a Restaurant
ALTER TABLE "Restaurant"
ADD COLUMN IF NOT EXISTS "bannerUrl" TEXT;

-- 2. Opcional: Copiar bannerUrl de Central a Restaurant para restaurantes existentes
-- Si un restaurante pertenece a una Central que tiene bannerUrl, copiarlo
UPDATE "Restaurant" r
SET "bannerUrl" = c."bannerUrl"
FROM "Central" c
WHERE r."centralId" = c.id
  AND c."bannerUrl" IS NOT NULL
  AND r."bannerUrl" IS NULL;

-- 3. Verificar que se agregó correctamente
SELECT 
  r.id,
  r.name,
  r."bannerUrl" as restaurant_banner,
  c."bannerUrl" as central_banner,
  c.name as central_name
FROM "Restaurant" r
LEFT JOIN "Central" c ON r."centralId" = c.id
WHERE r."centralId" IS NOT NULL
LIMIT 10;

