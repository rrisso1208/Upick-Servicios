-- ════════════════════════════════════════════════════════════
-- CREAR TU USUARIO COMO SUPERADMIN
-- ════════════════════════════════════════════════════════════

-- Reemplaza los datos con los tuyos

INSERT INTO "User" (
  id, 
  email, 
  role, 
  "firstName", 
  "lastName", 
  "phoneNumber",
  "universityId", 
  "restaurantId", 
  "isActive", 
  "createdAt", 
  "updatedAt"
)
VALUES (
  'cm3superadmin00001', -- ID único
  'u.pickcompany@gmail.com', -- ← Tu email aquí
  'superadmin', -- Rol de superadmin
  'Admin', -- ← Tu nombre
  'Upick', -- ← Tu apellido
  NULL, -- Teléfono (opcional)
  NULL, -- Sin universidad específica
  NULL, -- Sin restaurante específico
  true, -- Activo
  NOW(),
  NOW()
)
ON CONFLICT (email) 
DO UPDATE SET 
  role = 'superadmin',
  "isActive" = true,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";

-- Verificar que se creó correctamente
SELECT email, role, "firstName", "lastName", "isActive"
FROM "User"
WHERE email = 'u.pickcompany@gmail.com';


