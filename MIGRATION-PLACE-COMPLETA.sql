-- MIGRACIÓN COMPLETA: Crear/Actualizar tabla Place
-- Este script maneja ambos casos: si existe University o si no existe ninguna tabla
-- Ejecuta este script en Supabase SQL Editor

-- Paso 1: Verificar si existe University
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'University') THEN
    -- Caso 1: Existe University, renombrarla a Place
    RAISE NOTICE 'Renombrando tabla University a Place...';
    ALTER TABLE "University" RENAME TO "Place";
  ELSIF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Place') THEN
    -- Caso 2: No existe ninguna, crear Place desde cero
    RAISE NOTICE 'Creando tabla Place...';
    CREATE TABLE "Place" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "imageUrl" TEXT,
      "imagePosition" TEXT NOT NULL DEFAULT 'center',
      "imageScale" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,

      CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
    );
    
    CREATE UNIQUE INDEX IF NOT EXISTS "Place_slug_key" ON "Place"("slug");
    CREATE INDEX IF NOT EXISTS "Place_slug_idx" ON "Place"("slug");
    CREATE INDEX IF NOT EXISTS "Place_isActive_idx" ON "Place"("isActive");
  ELSE
    RAISE NOTICE 'La tabla Place ya existe.';
  END IF;
END $$;

-- Paso 2: Agregar columnas faltantes si no existen
DO $$
BEGIN
  -- Agregar imagePosition si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Place' 
    AND column_name = 'imagePosition'
  ) THEN
    ALTER TABLE "Place" ADD COLUMN "imagePosition" TEXT NOT NULL DEFAULT 'center';
    RAISE NOTICE 'Agregada columna imagePosition';
  END IF;

  -- Agregar imageScale si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Place' 
    AND column_name = 'imageScale'
  ) THEN
    ALTER TABLE "Place" ADD COLUMN "imageScale" DOUBLE PRECISION NOT NULL DEFAULT 1.0;
    RAISE NOTICE 'Agregada columna imageScale';
  END IF;
END $$;

-- Paso 3: Renombrar columnas universityId a placeId en tablas relacionadas
DO $$
BEGIN
  -- Restaurant
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Restaurant' 
    AND column_name = 'universityId'
  ) THEN
    ALTER TABLE "Restaurant" RENAME COLUMN "universityId" TO "placeId";
    RAISE NOTICE 'Renombrada columna Restaurant.universityId a placeId';
  END IF;

  -- User
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'User' 
    AND column_name = 'universityId'
  ) THEN
    ALTER TABLE "User" RENAME COLUMN "universityId" TO "placeId";
    RAISE NOTICE 'Renombrada columna User.universityId a placeId';
  END IF;

  -- Order
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Order' 
    AND column_name = 'universityId'
  ) THEN
    ALTER TABLE "Order" RENAME COLUMN "universityId" TO "placeId";
    RAISE NOTICE 'Renombrada columna Order.universityId a placeId';
  END IF;

  -- Coupon
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'Coupon' 
    AND column_name = 'universityId'
  ) THEN
    ALTER TABLE "Coupon" RENAME COLUMN "universityId" TO "placeId";
    RAISE NOTICE 'Renombrada columna Coupon.universityId a placeId';
  END IF;
END $$;

-- Paso 4: Actualizar índices
DROP INDEX IF EXISTS "Restaurant_universityId_idx";
CREATE INDEX IF NOT EXISTS "Restaurant_placeId_idx" ON "Restaurant"("placeId");

DROP INDEX IF EXISTS "User_universityId_idx";
CREATE INDEX IF NOT EXISTS "User_placeId_idx" ON "User"("placeId");

DROP INDEX IF EXISTS "Order_universityId_idx";
CREATE INDEX IF NOT EXISTS "Order_placeId_idx" ON "Order"("placeId");

DROP INDEX IF EXISTS "Coupon_universityId_idx";
CREATE INDEX IF NOT EXISTS "Coupon_placeId_idx" ON "Coupon"("placeId");

-- Paso 5: Actualizar foreign keys
DO $$
BEGIN
  -- Restaurant
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND constraint_name = 'Restaurant_universityId_fkey'
  ) THEN
    ALTER TABLE "Restaurant" DROP CONSTRAINT "Restaurant_universityId_fkey";
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND constraint_name = 'Restaurant_placeId_fkey'
  ) THEN
    ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_placeId_fkey" 
      FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  -- User
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND constraint_name = 'User_universityId_fkey'
  ) THEN
    ALTER TABLE "User" DROP CONSTRAINT "User_universityId_fkey";
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND constraint_name = 'User_placeId_fkey'
  ) THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_placeId_fkey" 
      FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  -- Order
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND constraint_name = 'Order_universityId_fkey'
  ) THEN
    ALTER TABLE "Order" DROP CONSTRAINT "Order_universityId_fkey";
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND constraint_name = 'Order_placeId_fkey'
  ) THEN
    ALTER TABLE "Order" ADD CONSTRAINT "Order_placeId_fkey" 
      FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  -- Coupon
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND constraint_name = 'Coupon_universityId_fkey'
  ) THEN
    ALTER TABLE "Coupon" DROP CONSTRAINT "Coupon_universityId_fkey";
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND constraint_name = 'Coupon_placeId_fkey'
  ) THEN
    ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_placeId_fkey" 
      FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Paso 6: Actualizar enum CommissionScope
-- IMPORTANTE: En PostgreSQL, los nuevos valores de enum deben ser commitados antes de usarse
-- Por eso separamos esto en dos pasos

-- Paso 6a: Agregar valor 'place' al enum (se commiteará automáticamente)
DO $$
BEGIN
  -- Agregar valor 'place' al enum si no existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'place' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'CommissionScope')
  ) THEN
    ALTER TYPE "CommissionScope" ADD VALUE 'place';
    RAISE NOTICE 'Agregado valor place al enum CommissionScope';
  END IF;
END $$;

-- Paso 6b: Actualizar registros existentes
-- IMPORTANTE: Ejecuta esta línea en una NUEVA QUERY después de que el paso 6a haya terminado
-- Descomenta la siguiente línea y ejecútala por separado:
-- UPDATE "CommissionPolicy" SET scope = 'place' WHERE scope = 'university';

-- Paso 7: Verificar resultado
SELECT 
    'Place' as table_name,
    COUNT(*) as row_count
FROM "Place"
UNION ALL
SELECT 
    'Restaurant (con placeId)' as table_name,
    COUNT(*) as row_count
FROM "Restaurant"
WHERE "placeId" IS NOT NULL;

-- Mostrar estructura de Place
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'Place'
ORDER BY ordinal_position;

