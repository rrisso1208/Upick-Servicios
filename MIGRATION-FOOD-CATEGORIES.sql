-- MIGRACIÓN: Crear tablas para categorías de comida
-- Ejecuta este script en Supabase SQL Editor

-- Paso 1: Crear tabla FoodCategory
CREATE TABLE IF NOT EXISTS "FoodCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "icon" TEXT,
  "color" TEXT NOT NULL DEFAULT 'primary',
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sort" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FoodCategory_pkey" PRIMARY KEY ("id")
);

-- Crear índices únicos
CREATE UNIQUE INDEX IF NOT EXISTS "FoodCategory_name_key" ON "FoodCategory"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "FoodCategory_slug_key" ON "FoodCategory"("slug");

-- Crear índices
CREATE INDEX IF NOT EXISTS "FoodCategory_slug_idx" ON "FoodCategory"("slug");
CREATE INDEX IF NOT EXISTS "FoodCategory_isActive_idx" ON "FoodCategory"("isActive");
CREATE INDEX IF NOT EXISTS "FoodCategory_sort_idx" ON "FoodCategory"("sort");

-- Paso 2: Crear tabla RestaurantFoodCategory
CREATE TABLE IF NOT EXISTS "RestaurantFoodCategory" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "foodCategoryId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RestaurantFoodCategory_pkey" PRIMARY KEY ("id")
);

-- Crear índice único compuesto
CREATE UNIQUE INDEX IF NOT EXISTS "RestaurantFoodCategory_restaurantId_foodCategoryId_key" 
  ON "RestaurantFoodCategory"("restaurantId", "foodCategoryId");

-- Crear índices
CREATE INDEX IF NOT EXISTS "RestaurantFoodCategory_restaurantId_idx" 
  ON "RestaurantFoodCategory"("restaurantId");
CREATE INDEX IF NOT EXISTS "RestaurantFoodCategory_foodCategoryId_idx" 
  ON "RestaurantFoodCategory"("foodCategoryId");

-- Crear foreign keys
ALTER TABLE "RestaurantFoodCategory" 
  ADD CONSTRAINT "RestaurantFoodCategory_restaurantId_fkey" 
  FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RestaurantFoodCategory" 
  ADD CONSTRAINT "RestaurantFoodCategory_foodCategoryId_fkey" 
  FOREIGN KEY ("foodCategoryId") REFERENCES "FoodCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Paso 3: Crear tabla ProductFoodCategory
CREATE TABLE IF NOT EXISTS "ProductFoodCategory" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "foodCategoryId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductFoodCategory_pkey" PRIMARY KEY ("id")
);

-- Crear índice único compuesto
CREATE UNIQUE INDEX IF NOT EXISTS "ProductFoodCategory_productId_foodCategoryId_key" 
  ON "ProductFoodCategory"("productId", "foodCategoryId");

-- Crear índices
CREATE INDEX IF NOT EXISTS "ProductFoodCategory_productId_idx" 
  ON "ProductFoodCategory"("productId");
CREATE INDEX IF NOT EXISTS "ProductFoodCategory_foodCategoryId_idx" 
  ON "ProductFoodCategory"("foodCategoryId");

-- Crear foreign keys
ALTER TABLE "ProductFoodCategory" 
  ADD CONSTRAINT "ProductFoodCategory_productId_fkey" 
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductFoodCategory" 
  ADD CONSTRAINT "ProductFoodCategory_foodCategoryId_fkey" 
  FOREIGN KEY ("foodCategoryId") REFERENCES "FoodCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Paso 4: Insertar categorías de comida iniciales
INSERT INTO "FoodCategory" ("id", "name", "slug", "icon", "color", "description", "isActive", "sort", "createdAt", "updatedAt")
VALUES
  ('food-cat-pizza', 'Pizza', 'pizza', 'pizza', 'red', 'Restaurantes especializados en pizza', true, 1, NOW(), NOW()),
  ('food-cat-hamburguesa', 'Hamburguesa', 'hamburguesa', 'hamburger', 'orange', 'Restaurantes de hamburguesas', true, 2, NOW(), NOW()),
  ('food-cat-saludable', 'Saludable', 'saludable', 'leaf', 'green', 'Opciones saludables y nutritivas', true, 3, NOW(), NOW()),
  ('food-cat-pasta', 'Pasta', 'pasta', 'utensils', 'blue', 'Platos de pasta italiana', true, 4, NOW(), NOW()),
  ('food-cat-asiatica', 'Asiática', 'asiatica', 'rice', 'purple', 'Comida asiática', true, 5, NOW(), NOW()),
  ('food-cat-mexicana', 'Mexicana', 'mexicana', 'pepper', 'red', 'Comida mexicana', true, 6, NOW(), NOW()),
  ('food-cat-postres', 'Postres', 'postres', 'ice-cream', 'pink', 'Dulces y postres', true, 7, NOW(), NOW()),
  ('food-cat-bebidas', 'Bebidas', 'bebidas', 'coffee', 'brown', 'Bebidas y café', true, 8, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

-- Verificar creación
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('FoodCategory', 'RestaurantFoodCategory', 'ProductFoodCategory')
ORDER BY table_name, column_name;

