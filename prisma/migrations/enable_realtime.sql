-- Enable Realtime for Order table
-- This allows Supabase Realtime to listen to changes on the Order table
-- Run this in Supabase SQL Editor

-- IMPORTANTE: Si obtienes un error diciendo que la tabla ya está en la publicación,
-- significa que Realtime YA ESTÁ CONFIGURADO correctamente. No necesitas hacer nada más.

-- Agregar Order table a la publicación supabase_realtime (solo si no está ya agregada)
DO $$
BEGIN
    -- Intentar agregar la tabla a la publicación
    -- Si ya existe, el error será ignorado
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE "Order";
        RAISE NOTICE 'Tabla Order agregada a la publicación supabase_realtime';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'La tabla Order ya está en la publicación supabase_realtime';
    END;
END $$;

-- Otorgar permisos necesarios para Realtime
-- Esto permite que los roles anon y authenticated reciban actualizaciones en tiempo real
GRANT SELECT ON TABLE "Order" TO anon;
GRANT SELECT ON TABLE "Order" TO authenticated;

-- Verificar que la tabla está en la publicación
SELECT 
    tablename,
    pubname,
    '✅ Realtime habilitado' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'Order';

-- Nota: Las políticas de Row Level Security (RLS) seguirán aplicándose
-- Los usuarios solo recibirán actualizaciones de pedidos que tienen permiso para ver

