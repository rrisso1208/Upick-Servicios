-- Script para verificar el estado de las tablas Place/University
-- Ejecuta esto en Supabase SQL Editor para diagnosticar

-- 1. Verificar si existe la tabla University
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'University'
) AS university_exists;

-- 2. Verificar si existe la tabla Place
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'Place'
) AS place_exists;

-- 3. Ver todas las tablas relacionadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('University', 'Place', 'Restaurant', 'User', 'Order', 'Coupon')
ORDER BY table_name;

-- 4. Ver columnas de Restaurant para verificar si usa universityId o placeId
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Restaurant'
AND column_name IN ('universityId', 'placeId')
ORDER BY column_name;

-- 5. Ver columnas de User para verificar si usa universityId o placeId
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'User'
AND column_name IN ('universityId', 'placeId')
ORDER BY column_name;

-- 6. Ver columnas de Order para verificar si usa universityId o placeId
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Order'
AND column_name IN ('universityId', 'placeId')
ORDER BY column_name;

