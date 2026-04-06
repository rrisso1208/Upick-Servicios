-- ════════════════════════════════════════════════════════════
-- DIAGNOSTICAR Y CREAR USUARIO ESTUDIANTE
-- ════════════════════════════════════════════════════════════
-- Ejecuta este script en Supabase SQL Editor para diagnosticar
-- y crear usuarios de estudiante si es necesario

-- 1. VERIFICAR SI EL USUARIO EXISTE EN NUESTRA BASE DE DATOS
SELECT 
  id,
  email,
  role,
  "firstName",
  "lastName",
  "isActive",
  "createdAt"
FROM "User"
WHERE email = 'jsrisso1218@gmail.com'
   OR email = 'jsrisso1218@GMAIL.COM'
   OR LOWER(email) = 'jsrisso1218@gmail.com';

-- 2. VERIFICAR SI EXISTE EN SUPABASE AUTH
-- (Ejecuta esto en Supabase Dashboard > Authentication > Users)
-- O usa esta query si tienes acceso:
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data
FROM auth.users
WHERE email = 'jsrisso1218@gmail.com'
   OR LOWER(email) = 'jsrisso1218@gmail.com';

-- 3. CREAR USUARIO EN NUESTRA BASE DE DATOS SI NO EXISTE
-- (Solo ejecuta esto si el usuario existe en Supabase Auth pero no en nuestra BD)
INSERT INTO "User" (
  email,
  role,
  "firstName",
  "lastName",
  "phoneNumber",
  "isActive",
  "createdAt",
  "updatedAt"
)
VALUES (
  'jsrisso1218@gmail.com', -- Email normalizado a minúsculas
  'student',
  'Juan',
  'Risso',
  '3225725739',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) 
DO UPDATE SET
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName",
  "phoneNumber" = EXCLUDED."phoneNumber",
  "isActive" = true,
  "updatedAt" = NOW();

-- 4. NORMALIZAR TODOS LOS EMAILS EXISTENTES A MINÚSCULAS
-- (Ejecuta esto para corregir emails que puedan tener mayúsculas)
UPDATE "User"
SET email = LOWER(TRIM(email))
WHERE email != LOWER(TRIM(email));

-- 5. VERIFICAR RESULTADO FINAL
SELECT 
  id,
  email,
  role,
  "firstName",
  "lastName",
  "isActive"
FROM "User"
WHERE LOWER(email) = 'jsrisso1218@gmail.com';

