-- PASO 7: Actualizar registros de CommissionPolicy
-- Ejecuta ESTE script DESPUÉS de ejecutar MIGRATION-PLACE-COMPLETA-FIX.sql
-- Este paso debe ejecutarse en una query separada porque el enum necesita ser commitado primero

UPDATE "CommissionPolicy" SET scope = 'place' WHERE scope = 'university';

-- Verificar que se actualizaron
SELECT scope, COUNT(*) as count 
FROM "CommissionPolicy" 
GROUP BY scope;

