-- ════════════════════════════════════════════════════════════
-- CONVERTIR UN USUARIO EN SUPERADMIN
-- ════════════════════════════════════════════════════════════

-- Reemplaza 'TU-EMAIL@AQUI.COM' con tu email real

-- 1. Actualizar rol a superadmin
UPDATE "User" 
SET role = 'superadmin'
WHERE email = 'TU-EMAIL@AQUI.COM';

-- 2. Verificar que cambió
SELECT email, role, "firstName", "lastName", "isActive"
FROM "User"
WHERE email = 'TU-EMAIL@AQUI.COM';

-- ════════════════════════════════════════════════════════════
-- Si quieres crear más admins de restaurante:
-- ════════════════════════════════════════════════════════════

-- Cambiar a restaurant_admin y asignar restaurante
UPDATE "User" 
SET 
  role = 'restaurant_admin',
  "restaurantId" = 'cm3g8h1a00001lz8f3abc5xyz'  -- ID de Cafetería Central
WHERE email = 'OTRO-EMAIL@AQUI.COM';

-- Ver todos los restaurantes disponibles:
SELECT id, name, slug FROM "Restaurant";


