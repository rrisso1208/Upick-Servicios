-- MIGRACIÓN: Cambiar University → Place en toda la base de datos
-- Ejecuta este script en Supabase SQL Editor

-- Paso 1: Renombrar tabla University a Place
ALTER TABLE "University" RENAME TO "Place";

-- Paso 2: Renombrar columnas universityId a placeId
-- En Restaurant
ALTER TABLE "Restaurant" RENAME COLUMN "universityId" TO "placeId";

-- En User
ALTER TABLE "User" RENAME COLUMN "universityId" TO "placeId";

-- En Order
ALTER TABLE "Order" RENAME COLUMN "universityId" TO "placeId";

-- En Coupon
ALTER TABLE "Coupon" RENAME COLUMN "universityId" TO "placeId";

-- Paso 3: Renombrar índices
-- Restaurant
DROP INDEX IF EXISTS "Restaurant_universityId_idx";
CREATE INDEX IF NOT EXISTS "Restaurant_placeId_idx" ON "Restaurant"("placeId");

-- User
DROP INDEX IF EXISTS "User_universityId_idx";
CREATE INDEX IF NOT EXISTS "User_placeId_idx" ON "User"("placeId");

-- Order
DROP INDEX IF EXISTS "Order_universityId_idx";
CREATE INDEX IF NOT EXISTS "Order_placeId_idx" ON "Order"("placeId");

-- Coupon
DROP INDEX IF EXISTS "Coupon_universityId_idx";
CREATE INDEX IF NOT EXISTS "Coupon_placeId_idx" ON "Coupon"("placeId");

-- Paso 4: Renombrar foreign keys
-- Restaurant
ALTER TABLE "Restaurant" DROP CONSTRAINT IF EXISTS "Restaurant_universityId_fkey";
ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_placeId_fkey" 
  FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- User
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_universityId_fkey";
ALTER TABLE "User" ADD CONSTRAINT "User_placeId_fkey" 
  FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Order
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_universityId_fkey";
ALTER TABLE "Order" ADD CONSTRAINT "Order_placeId_fkey" 
  FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Coupon
ALTER TABLE "Coupon" DROP CONSTRAINT IF EXISTS "Coupon_universityId_fkey";
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_placeId_fkey" 
  FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Paso 5: Actualizar enum CommissionScope
-- Primero crear el nuevo valor
ALTER TYPE "CommissionScope" ADD VALUE IF NOT EXISTS 'place';

-- Actualizar registros existentes
UPDATE "CommissionPolicy" SET scope = 'place' WHERE scope = 'university';

-- Nota: No podemos eliminar 'university' del enum porque PostgreSQL no lo permite directamente
-- Los valores antiguos quedarán pero no se usarán

-- Verificar cambios
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('Place', 'Restaurant', 'User', 'Order', 'Coupon')
    AND column_name IN ('placeId', 'id')
ORDER BY table_name, column_name;

