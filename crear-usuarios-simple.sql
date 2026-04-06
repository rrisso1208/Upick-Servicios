-- ════════════════════════════════════════════════════════════
-- MÉTODO SIMPLE: Ejecuta estos comandos UNO POR UNO
-- ════════════════════════════════════════════════════════════

-- OPCIÓN: Usa la función de Supabase para crear usuarios
-- Lamentablemente no hay función SQL directa en Supabase para esto
-- Es mejor usar la interfaz gráfica (Dashboard > Authentication > Users > Add user)

-- ════════════════════════════════════════════════════════════
-- ALTERNATIVA: Habilitar confirmación automática por email
-- ════════════════════════════════════════════════════════════

-- Esto permite que al hacer signup, no necesiten confirmar email
-- Ejecuta en SQL Editor:

-- Ver configuración actual
SELECT * FROM auth.config;

-- Nota: La configuración se hace desde Settings > Authentication
-- NO desde SQL. Ve a:
-- Settings > Authentication > Email Auth
-- Y DESACTIVA: "Enable email confirmations"
-- 
-- Esto permite que al registrarse, puedan entrar inmediatamente


