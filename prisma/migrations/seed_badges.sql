-- Seed badges for products
-- This migration inserts initial badges that can be assigned to products
-- Uses DO block to handle conflicts gracefully by checking if badge exists first

DO $$
BEGIN
  -- Insert or update each badge (using id as conflict key since it's the primary key)
  INSERT INTO "Badge" (id, name, icon, color, description, "isActive", sort, "createdAt", "updatedAt")
  VALUES
    ('badge_vegano', 'Vegano', 'leaf', 'green', 'Producto 100% vegano, sin ingredientes de origen animal', true, 1, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    description = EXCLUDED.description,
    "isActive" = EXCLUDED."isActive",
    sort = EXCLUDED.sort,
    "updatedAt" = NOW();

  INSERT INTO "Badge" (id, name, icon, color, description, "isActive", sort, "createdAt", "updatedAt")
  VALUES
    ('badge_vegetariano', 'Vegetariano', 'leaf', 'green', 'Producto vegetariano, sin carne', true, 2, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    description = EXCLUDED.description,
    "isActive" = EXCLUDED."isActive",
    sort = EXCLUDED.sort,
    "updatedAt" = NOW();

  INSERT INTO "Badge" (id, name, icon, color, description, "isActive", sort, "createdAt", "updatedAt")
  VALUES
    ('badge_sin_gluten', 'Sin Gluten', 'wheat', 'blue', 'Producto libre de gluten', true, 3, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    description = EXCLUDED.description,
    "isActive" = EXCLUDED."isActive",
    sort = EXCLUDED.sort,
    "updatedAt" = NOW();

  INSERT INTO "Badge" (id, name, icon, color, description, "isActive", sort, "createdAt", "updatedAt")
  VALUES
    ('badge_bajo_grasas', 'Bajo en Grasas', 'heart', 'green', 'Producto bajo en grasas saturadas', true, 4, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    description = EXCLUDED.description,
    "isActive" = EXCLUDED."isActive",
    sort = EXCLUDED.sort,
    "updatedAt" = NOW();

  INSERT INTO "Badge" (id, name, icon, color, description, "isActive", sort, "createdAt", "updatedAt")
  VALUES
    ('badge_contiene_nueces', 'Contiene Nueces', 'alert-triangle', 'yellow', 'Este producto contiene nueces o frutos secos', true, 5, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    description = EXCLUDED.description,
    "isActive" = EXCLUDED."isActive",
    sort = EXCLUDED.sort,
    "updatedAt" = NOW();

  INSERT INTO "Badge" (id, name, icon, color, description, "isActive", sort, "createdAt", "updatedAt")
  VALUES
    ('badge_contiene_camarones', 'Contiene Camarones', 'fish', 'red', 'Este producto contiene camarones o mariscos', true, 6, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    description = EXCLUDED.description,
    "isActive" = EXCLUDED."isActive",
    sort = EXCLUDED.sort,
    "updatedAt" = NOW();

  INSERT INTO "Badge" (id, name, icon, color, description, "isActive", sort, "createdAt", "updatedAt")
  VALUES
    ('badge_contiene_lacteos', 'Contiene Lácteos', 'milk', 'blue', 'Este producto contiene lácteos', true, 7, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    description = EXCLUDED.description,
    "isActive" = EXCLUDED."isActive",
    sort = EXCLUDED.sort,
    "updatedAt" = NOW();

  INSERT INTO "Badge" (id, name, icon, color, description, "isActive", sort, "createdAt", "updatedAt")
  VALUES
    ('badge_contiene_huevo', 'Contiene Huevo', 'egg', 'yellow', 'Este producto contiene huevo', true, 8, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    description = EXCLUDED.description,
    "isActive" = EXCLUDED."isActive",
    sort = EXCLUDED.sort,
    "updatedAt" = NOW();

  INSERT INTO "Badge" (id, name, icon, color, description, "isActive", sort, "createdAt", "updatedAt")
  VALUES
    ('badge_picante', 'Picante', 'flame', 'red', 'Producto picante o con especias fuertes', true, 9, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    description = EXCLUDED.description,
    "isActive" = EXCLUDED."isActive",
    sort = EXCLUDED.sort,
    "updatedAt" = NOW();

  INSERT INTO "Badge" (id, name, icon, color, description, "isActive", sort, "createdAt", "updatedAt")
  VALUES
    ('badge_sin_azucar', 'Sin Azúcar', 'ban', 'green', 'Producto sin azúcar añadida', true, 10, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    description = EXCLUDED.description,
    "isActive" = EXCLUDED."isActive",
    sort = EXCLUDED.sort,
    "updatedAt" = NOW();

  INSERT INTO "Badge" (id, name, icon, color, description, "isActive", sort, "createdAt", "updatedAt")
  VALUES
    ('badge_alto_proteina', 'Alto en Proteína', 'dumbbell', 'blue', 'Producto rico en proteínas', true, 11, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    description = EXCLUDED.description,
    "isActive" = EXCLUDED."isActive",
    sort = EXCLUDED.sort,
    "updatedAt" = NOW();

  INSERT INTO "Badge" (id, name, icon, color, description, "isActive", sort, "createdAt", "updatedAt")
  VALUES
    ('badge_rico_fibra', 'Rico en Fibra', 'grain', 'green', 'Producto con alto contenido de fibra', true, 12, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    description = EXCLUDED.description,
    "isActive" = EXCLUDED."isActive",
    sort = EXCLUDED.sort,
    "updatedAt" = NOW();
END $$;

