-- Upick Seed Data
-- Este script crea datos de prueba para el proyecto

-- 1. Universidad
INSERT INTO "University" (id, name, slug, "isActive", "createdAt", "updatedAt")
VALUES ('cm3g8h1a00000lz8f2yzk4wqp', 'Universidad Nacional de Colombia', 'universidad-nacional', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Restaurantes
INSERT INTO "Restaurant" (id, "universityId", name, slug, location, description, "openHours", "pickupSlotMinutes", "capacityPerSlotDefault", "isActive", "createdAt", "updatedAt")
VALUES 
('cm3g8h1a00001lz8f3abc5xyz', 'cm3g8h1a00000lz8f2yzk4wqp', 'Cafetería Central', 'cafeteria-central', 'Edificio 401, Primer piso', 'Comida tradicional colombiana y menú ejecutivo', 
 '{"monday":{"open":"07:00","close":"18:00"},"tuesday":{"open":"07:00","close":"18:00"},"wednesday":{"open":"07:00","close":"18:00"},"thursday":{"open":"07:00","close":"18:00"},"friday":{"open":"07:00","close":"16:00"}}'::jsonb,
 10, 25, true, NOW(), NOW()),
('cm3g8h1a00002lz8f4def6xyz', 'cm3g8h1a00000lz8f2yzk4wqp', 'Burger Campus', 'burger-campus', 'Plaza de eventos', 'Hamburguesas artesanales y comida rápida premium',
 '{"monday":{"open":"11:00","close":"20:00"},"tuesday":{"open":"11:00","close":"20:00"},"wednesday":{"open":"11:00","close":"20:00"},"thursday":{"open":"11:00","close":"20:00"},"friday":{"open":"11:00","close":"21:00"},"saturday":{"open":"12:00","close":"21:00"}}'::jsonb,
 15, 20, true, NOW(), NOW()),
('cm3g8h1a00003lz8f5ghi7xyz', 'cm3g8h1a00000lz8f2yzk4wqp', 'Salud Verde', 'salud-verde', 'Biblioteca Central', 'Ensaladas, smoothies y opciones saludables',
 '{"monday":{"open":"08:00","close":"17:00"},"tuesday":{"open":"08:00","close":"17:00"},"wednesday":{"open":"08:00","close":"17:00"},"thursday":{"open":"08:00","close":"17:00"},"friday":{"open":"08:00","close":"17:00"}}'::jsonb,
 10, 15, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. Usuarios
INSERT INTO "User" (id, email, role, "universityId", "restaurantId", "firstName", "lastName", "phoneNumber", "isActive", "createdAt", "updatedAt")
VALUES 
('cm3g8h1a00004lz8f6jkl8xyz', 'superadmin@upic.app', 'superadmin', NULL, NULL, 'Super', 'Admin', NULL, true, NOW(), NOW()),
('cm3g8h1a00005lz8f7mno9xyz', 'admin@cafeteria-central.com', 'restaurant_admin', 'cm3g8h1a00000lz8f2yzk4wqp', 'cm3g8h1a00001lz8f3abc5xyz', 'Admin', 'Cafetería', NULL, true, NOW(), NOW()),
('cm3g8h1a00006lz8f8pqr0xyz', 'estudiante@unal.edu.co', 'student', 'cm3g8h1a00000lz8f2yzk4wqp', NULL, 'Juan', 'Estudiante', '3001234567', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 4. Categorías
INSERT INTO "Category" (id, "restaurantId", name, description, sort, "isActive", "createdAt", "updatedAt")
VALUES 
('cm3g8h1a00007lz8f9stu1xyz', 'cm3g8h1a00001lz8f3abc5xyz', 'Platos Fuertes', NULL, 1, true, NOW(), NOW()),
('cm3g8h1a00008lz8f0vwx2xyz', 'cm3g8h1a00001lz8f3abc5xyz', 'Bebidas', NULL, 2, true, NOW(), NOW()),
('cm3g8h1a00009lz8f1yza3xyz', 'cm3g8h1a00002lz8f4def6xyz', 'Hamburguesas', NULL, 1, true, NOW(), NOW()),
('cm3g8h1a00010lz8f2bcd4xyz', 'cm3g8h1a00003lz8f5ghi7xyz', 'Ensaladas', NULL, 1, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 5. Productos
INSERT INTO "Product" (id, "restaurantId", "categoryId", name, description, price, "imageUrl", "isActive", "prepMinutes", sort, "createdAt", "updatedAt")
VALUES 
('cm3g8h1a00011lz8f3efg5xyz', 'cm3g8h1a00001lz8f3abc5xyz', 'cm3g8h1a00007lz8f9stu1xyz', 'Bandeja Paisa', 'Frijoles, arroz, chicharrón, huevo, aguacate, plátano maduro', 1500000, NULL, true, 15, 0, NOW(), NOW()),
('cm3g8h1a00012lz8f4hij6xyz', 'cm3g8h1a00001lz8f3abc5xyz', 'cm3g8h1a00007lz8f9stu1xyz', 'Ajiaco', 'Sopa tradicional con pollo, papas y mazorca', 1200000, NULL, true, 10, 0, NOW(), NOW()),
('cm3g8h1a00013lz8f5klm7xyz', 'cm3g8h1a00001lz8f3abc5xyz', 'cm3g8h1a00008lz8f0vwx2xyz', 'Jugo Natural', 'Jugo de frutas naturales', 300000, NULL, true, 5, 0, NOW(), NOW()),
('cm3g8h1a00014lz8f6nop8xyz', 'cm3g8h1a00002lz8f4def6xyz', 'cm3g8h1a00009lz8f1yza3xyz', 'Burger Clásica', 'Carne 150g, lechuga, tomate, queso, salsas', 1800000, NULL, true, 12, 0, NOW(), NOW()),
('cm3g8h1a00015lz8f7qrs9xyz', 'cm3g8h1a00003lz8f5ghi7xyz', 'cm3g8h1a00010lz8f2bcd4xyz', 'Ensalada César', 'Lechuga romana, pollo, crutones, parmesano', 1400000, NULL, true, 8, 0, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 6. Grupo de opciones para Burger
INSERT INTO "ProductOptionGroup" (id, "productId", name, min, max, required, sort, "createdAt", "updatedAt")
VALUES 
('cm3g8h1a00016lz8f8tuv0xyz', 'cm3g8h1a00014lz8f6nop8xyz', 'Tamaño', 1, 1, true, 1, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 7. Opciones de producto
INSERT INTO "ProductOption" (id, "groupId", name, "priceDelta", "isDefault", sort, "isActive", "createdAt", "updatedAt")
VALUES 
('cm3g8h1a00017lz8f9wxy1xyz', 'cm3g8h1a00016lz8f8tuv0xyz', 'Sencilla', 0, true, 1, true, NOW(), NOW()),
('cm3g8h1a00018lz8f0zab2xyz', 'cm3g8h1a00016lz8f8tuv0xyz', 'Doble Carne', 500000, false, 2, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 8. Política de comisión global (4%)
INSERT INTO "CommissionPolicy" (id, scope, "scopeRefId", type, "rateFixed", "tiersJson", "effectiveFrom", "effectiveTo", "isActive", "createdAt", "updatedAt")
VALUES 
('global-default-policy', 'global', NULL, 'fixed', 0.0400, NULL, '2024-01-01'::timestamp, NULL, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Verificación
SELECT 'Seed completado!' as mensaje;
SELECT COUNT(*) as universidades FROM "University";
SELECT COUNT(*) as restaurantes FROM "Restaurant";
SELECT COUNT(*) as usuarios FROM "User";
SELECT COUNT(*) as categorias FROM "Category";
SELECT COUNT(*) as productos FROM "Product";
SELECT COUNT(*) as politicas FROM "CommissionPolicy";

