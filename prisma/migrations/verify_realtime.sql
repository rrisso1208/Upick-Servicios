-- Script de verificación: Verificar que Realtime está configurado correctamente
-- Ejecuta este script para verificar el estado de Realtime

-- 1. Verificar que Order está en la publicación
SELECT 
    tablename as "Tabla",
    pubname as "Publicación",
    CASE 
        WHEN tablename = 'Order' THEN '✅ Configurado'
        ELSE '❌ No configurado'
    END as "Estado"
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'Order';

-- 2. Verificar permisos
SELECT 
    grantee as "Rol",
    privilege_type as "Permiso",
    table_name as "Tabla"
FROM information_schema.role_table_grants 
WHERE table_name = 'Order'
AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;

-- 3. Ver todas las tablas en la publicación supabase_realtime
SELECT 
    tablename as "Tablas con Realtime habilitado"
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

