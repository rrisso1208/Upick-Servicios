-- Script para verificar y corregir el rol del usuario superadmin
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Verificar el usuario actual
SELECT id, email, role, "isActive", "universityId", "restaurantId"
FROM "User"
WHERE email = 'u.pickcompany@gmail.com';

-- 2. Si el usuario existe pero no tiene el rol correcto, actualízalo:
UPDATE "User"
SET role = 'superadmin'
WHERE email = 'u.pickcompany@gmail.com';

-- 3. Si el usuario no existe, créalo (necesitarás el ID de Supabase Auth):
-- Primero obtén el ID del usuario desde Supabase Auth Dashboard
-- Luego ejecuta:
-- INSERT INTO "User" (id, email, role, "isActive", "createdAt", "updatedAt")
-- VALUES ('<SUPABASE_AUTH_USER_ID>', 'u.pickcompany@gmail.com', 'superadmin', true, NOW(), NOW());

-- 4. Verificar que quedó correcto:
SELECT id, email, role, "isActive"
FROM "User"
WHERE email = 'u.pickcompany@gmail.com';


