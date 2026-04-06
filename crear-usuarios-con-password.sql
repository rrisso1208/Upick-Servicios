-- ════════════════════════════════════════════════════════════
-- CREAR USUARIOS DE PRUEBA EN SUPABASE AUTH CON CONTRASEÑA
-- ════════════════════════════════════════════════════════════
-- Ejecuta este SQL en Supabase SQL Editor para crear usuarios con contraseña

-- IMPORTANTE: Estos usuarios solo existen en Supabase Auth
-- Ya tienes los registros en tu tabla User de la base de datos

-- 1. SUPERADMIN
-- Email: superadmin@upic.app
-- Password: Admin123!
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'superadmin@upic.app',
  crypt('Admin123!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"superadmin"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- 2. ADMIN RESTAURANTE
-- Email: admin@cafeteria-central.com  
-- Password: Admin123!
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@cafeteria-central.com',
  crypt('Admin123!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"restaurant_admin"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- 3. ESTUDIANTE
-- Email: estudiante@unal.edu.co
-- Password: Student123!
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'estudiante@unal.edu.co',
  crypt('Student123!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"student"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- Verificación
SELECT email, created_at, email_confirmed_at 
FROM auth.users 
WHERE email IN ('superadmin@upic.app', 'admin@cafeteria-central.com', 'estudiante@unal.edu.co');


