-- Migration: Agregar tipos de notificación para cambios POS
-- Fecha: 2024-01-XX
-- Descripción: Agrega PRICE_CHANGE e INVENTORY_CHANGE al enum NotificationType

-- Agregar nuevos valores al enum si no existen
DO $$ BEGIN
    -- Verificar si PRICE_CHANGE ya existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'PRICE_CHANGE' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')
    ) THEN
        ALTER TYPE "NotificationType" ADD VALUE 'PRICE_CHANGE';
    END IF;

    -- Verificar si INVENTORY_CHANGE ya existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'INVENTORY_CHANGE' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')
    ) THEN
        ALTER TYPE "NotificationType" ADD VALUE 'INVENTORY_CHANGE';
    END IF;
END $$;



