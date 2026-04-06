-- Script para verificar qué tablas faltan
-- Ejecuta esto en Supabase SQL Editor para ver qué falta

SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('ProductOptionGroup', 'ProductOption', 'Badge', 'ProductBadge') 
        THEN '✅ Existe'
        ELSE '❌ Falta'
    END as estado
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('ProductOptionGroup', 'ProductOption', 'Badge', 'ProductBadge')
ORDER BY table_name;

-- Si no aparece ninguna fila, significa que todas las tablas faltan
-- Si aparecen algunas pero no todas, ejecuta MIGRATION-TABLAS-FALTANTES.sql
