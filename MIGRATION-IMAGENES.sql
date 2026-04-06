-- MIGRACIÓN: Agregar columnas de ajuste de imagen
-- Ejecuta este script en Supabase SQL Editor

-- Agregar columnas a University
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'University' AND column_name = 'imageUrl') THEN
        ALTER TABLE "University" ADD COLUMN "imageUrl" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'University' AND column_name = 'imagePosition') THEN
        ALTER TABLE "University" ADD COLUMN "imagePosition" TEXT NOT NULL DEFAULT 'center';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'University' AND column_name = 'imageScale') THEN
        ALTER TABLE "University" ADD COLUMN "imageScale" DOUBLE PRECISION NOT NULL DEFAULT 1.0;
    END IF;
END $$;

-- Agregar columnas a Restaurant
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Restaurant' AND column_name = 'imageUrl') THEN
        ALTER TABLE "Restaurant" ADD COLUMN "imageUrl" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Restaurant' AND column_name = 'imagePosition') THEN
        ALTER TABLE "Restaurant" ADD COLUMN "imagePosition" TEXT NOT NULL DEFAULT 'center';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Restaurant' AND column_name = 'imageScale') THEN
        ALTER TABLE "Restaurant" ADD COLUMN "imageScale" DOUBLE PRECISION NOT NULL DEFAULT 1.0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Restaurant' AND column_name = 'isOverloaded') THEN
        ALTER TABLE "Restaurant" ADD COLUMN "isOverloaded" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Restaurant' AND column_name = 'overloadUntil') THEN
        ALTER TABLE "Restaurant" ADD COLUMN "overloadUntil" TIMESTAMP(3);
    END IF;
END $$;

-- Agregar columnas a Product
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Product' AND column_name = 'imageUrl') THEN
        ALTER TABLE "Product" ADD COLUMN "imageUrl" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Product' AND column_name = 'imagePosition') THEN
        ALTER TABLE "Product" ADD COLUMN "imagePosition" TEXT NOT NULL DEFAULT 'center';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Product' AND column_name = 'imageScale') THEN
        ALTER TABLE "Product" ADD COLUMN "imageScale" DOUBLE PRECISION NOT NULL DEFAULT 1.0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Product' AND column_name = 'isFeatured') THEN
        ALTER TABLE "Product" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Product' AND column_name = 'promotionPrice') THEN
        ALTER TABLE "Product" ADD COLUMN "promotionPrice" INTEGER;
    END IF;
END $$;

-- Verificar que se agregaron correctamente
SELECT 
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name IN ('University', 'Restaurant', 'Product')
    AND column_name IN ('imageUrl', 'imagePosition', 'imageScale', 'isOverloaded', 'overloadUntil', 'isFeatured', 'promotionPrice')
ORDER BY table_name, column_name;

