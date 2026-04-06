-- ════════════════════════════════════════════════════════════
-- LIMPIAR TODOS LOS DATOS DE PRUEBA
-- ════════════════════════════════════════════════════════════
-- Este script elimina todos los datos EXCEPTO tu usuario superadmin
-- Después podrás crear todo desde cero

-- 1. Eliminar datos financieros y de pedidos
DELETE FROM "OrderFinance";
DELETE FROM "OrderItemOption";
DELETE FROM "OrderItem";
DELETE FROM "Payment";
DELETE FROM "SlotCapacity";
DELETE FROM "Order";

-- 2. Eliminar productos y menú
DELETE FROM "ProductOption";
DELETE FROM "ProductOptionGroup";
DELETE FROM "Product";
DELETE FROM "Category";

-- 3. Eliminar restaurantes
DELETE FROM "Restaurant";

-- 4. Eliminar universidades
DELETE FROM "University";

-- 5. Eliminar usuarios que NO sean superadmin
DELETE FROM "User" 
WHERE role != 'superadmin';

-- 6. Verificar que solo quede tu usuario
SELECT 
  email, 
  role, 
  "firstName", 
  "lastName", 
  "isActive"
FROM "User"
WHERE role = 'superadmin';

-- ════════════════════════════════════════════════════════════
-- RESULTADO ESPERADO:
-- ════════════════════════════════════════════════════════════
-- Solo debe aparecer tu usuario: u.pickcompany@gmail.com
-- Todo lo demás estará limpio para empezar desde cero
-- ════════════════════════════════════════════════════════════


