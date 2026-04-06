-- Script para actualizar los iconos de las categorías de pasta y comida mexicana
-- Ejecutar este script en Supabase SQL Editor

-- Actualizar categoría de pasta (si existe con icono 'utensils' o similar)
UPDATE "FoodCategory"
SET icon = 'pasta'
WHERE (slug = 'pasta' OR name ILIKE '%pasta%')
  AND icon != 'pasta';

-- Actualizar categoría de comida mexicana/taco (si existe con icono 'pepper' o similar)
UPDATE "FoodCategory"
SET icon = 'taco'
WHERE (slug = 'taco' OR slug = 'mexicana' OR name ILIKE '%taco%' OR name ILIKE '%mexicana%')
  AND icon != 'taco';

-- Verificar los cambios
SELECT id, name, slug, icon, color
FROM "FoodCategory"
WHERE slug IN ('pasta', 'taco', 'mexicana') OR name ILIKE '%pasta%' OR name ILIKE '%mexicana%' OR name ILIKE '%taco%';

