# 📋 Guía de Configuración Paso a Paso - Upick

## ✅ Lo que YA está hecho (automatizado)

- ✓ Toda la estructura de archivos y código
- ✓ Configuración de Next.js, Prisma, TypeScript
- ✓ Modelos de base de datos
- ✓ Endpoints API
- ✓ Componentes UI
- ✓ Sistema de autenticación (código listo)
- ✓ Integración de pagos (código listo)
- ✓ Scripts de seed

---

## 🔧 Lo que NECESITAS HACER (requiere tu intervención)

### PASO 1: Instalar Dependencias

```bash
cd upic
pnpm install
```

**¿Qué hace?** Instala todas las librerías necesarias (Next.js, Prisma, React, etc.)

**Tiempo estimado:** 2-3 minutos

**Posibles errores:**
- Si no tienes pnpm: `npm install -g pnpm`
- Si falla: borra `node_modules` y `pnpm-lock.yaml`, luego intenta de nuevo

---

### PASO 2: Crear Cuenta en Supabase (Base de Datos + Auth)

#### 2.1 Registrarse

1. Ve a: https://supabase.com
2. Click en "Start your project"
3. Regístrate con GitHub o email
4. Es GRATIS (plan gratuito)

#### 2.2 Crear Proyecto

1. Click "New Project"
2. Nombre: `upic-dev` (o el que prefieras)
3. Database Password: **Guarda esto en un lugar seguro** (lo necesitarás)
4. Region: South America (São Paulo) - es el más cercano
5. Click "Create new project"
6. **Espera 1-2 minutos** mientras se crea

#### 2.3 Obtener Credenciales

Una vez creado el proyecto:

1. Ve a **Settings** (⚙️ en el sidebar izquierdo)
2. Click en **API**
3. Copia estas 3 cosas:

```
✓ Project URL (ejemplo: https://abcdefgh.supabase.co)
✓ anon public key (comienza con "eyJh...")
✓ service_role key (comienza con "eyJh..." - diferente al anterior)
```

**💡 TIP:** Deja esta pestaña abierta, la necesitarás en el PASO 4

---

### PASO 3: Crear Cuenta en Wompi (Pagos) - SANDBOX

#### 3.1 Registrarse

1. Ve a: https://comercios.wompi.co/signup
2. Regístrate (es GRATIS para sandbox/pruebas)
3. Verifica tu email

#### 3.2 Activar Modo Sandbox

1. Una vez logueado, ve a **Configuración** o **Settings**
2. Activa el **Modo Sandbox/Test**
3. Esto te permite hacer pruebas SIN dinero real

#### 3.3 Obtener Keys

1. Ve a **Configuración** > **Producción y Pruebas**
2. En la sección "Pruebas" (Test), copia:

```
✓ Llave pública de pruebas (pub_test_...)
✓ Llave privada de pruebas (prv_test_...)
```

3. **Webhook Secret:** Por ahora usa cualquier string random, ej: `test-webhook-secret-123`

**💡 TIP:** Guarda estas keys en un archivo temporal

---

### PASO 4: Configurar Variables de Entorno

#### 4.1 Crear archivo .env

En la carpeta `upic/`, crea un archivo llamado exactamente `.env`

```bash
# Desde la terminal en upic/:
copy .env.example .env    # Windows
# o
cp .env.example .env      # Mac/Linux
```

#### 4.2 Editar .env

Abre el archivo `.env` con un editor de texto y REEMPLAZA estos valores:

```env
# ============================================
# IMPORTANTE: Reemplaza TODOS los valores "xxx" con tus credenciales reales
# ============================================

# 1. APP
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# 2. SUPABASE (copiar del PASO 2.3)
NEXT_PUBLIC_SUPABASE_URL=https://tuproyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...tu-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...tu-service-role-key-aqui

# 3. DATABASE (usar la connection string de Supabase)
# Ve a Supabase > Settings > Database > Connection string > URI
# Reemplaza [YOUR-PASSWORD] con tu contraseña de Supabase
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.tuproyecto.supabase.co:5432/postgres

# 4. WOMPI (copiar del PASO 3.3)
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_test_abcd1234
WOMPI_PRIVATE_KEY=prv_test_xyz9876
WOMPI_WEBHOOK_SECRET=test-webhook-secret-123
WOMPI_API_URL=https://sandbox.wompi.co/v1

# 5. OPCIONALES (puedes dejarlos comentados por ahora)
# RESEND_API_KEY=re_xxx
# WHATSAPP_META_TOKEN=xxx
# WHATSAPP_PHONE_NUMBER_ID=xxx
# SENTRY_DSN=xxx

# 6. CONFIG
DEFAULT_COMMISSION_RATE=0.04
COMMISSION_BASE_MODE=subtotal_plus_tax
```

**⚠️ VERIFICA:**
- Que NO haya espacios antes/después del `=`
- Que las URLs NO terminen en `/`
- Que reemplazaste TODAS las "xxx"

---

### PASO 5: Configurar Base de Datos

#### 5.1 Generar Cliente Prisma

```bash
pnpm db:generate
```

**¿Qué hace?** Genera el código TypeScript para interactuar con la base de datos

**Tiempo:** 5-10 segundos

#### 5.2 Crear Tablas en la Base de Datos

```bash
pnpm db:push
```

**¿Qué hace?** Crea todas las 16 tablas en tu base de datos Supabase

**Tiempo:** 10-15 segundos

**Salida esperada:**
```
✔ Generated Prisma Client
🚀  Your database is now in sync with your Prisma schema.
```

**Si falla:**
- Verifica que el `DATABASE_URL` en `.env` sea correcto
- Verifica que la contraseña no tenga caracteres especiales (o escápala)
- Intenta copiar la connection string de nuevo desde Supabase

#### 5.3 Poblar con Datos de Prueba

```bash
pnpm db:seed
```

**¿Qué hace?** Crea:
- 1 Universidad (Universidad Nacional)
- 3 Restaurantes (Cafetería Central, Burger Campus, Salud Verde)
- Productos de ejemplo
- 3 Usuarios de prueba
- 1 Política de comisión global (4%)

**Tiempo:** 3-5 segundos

**Salida esperada:**
```
🌱 Starting database seed...
✅ University created: Universidad Nacional de Colombia
✅ Created 3 restaurants
✅ Menu items created
✅ Commission policy created (4% global)
✅ Test users created
🎉 Seed completed successfully!

Test credentials:
  Superadmin: superadmin@upic.app
  Restaurant Admin: admin@cafeteria-central.com
  Student: estudiante@unal.edu.co

Visit: http://localhost:3000/universidad-nacional
```

---

### PASO 6: Ejecutar el Servidor de Desarrollo

```bash
pnpm dev
```

**¿Qué hace?** Inicia el servidor de Next.js

**Tiempo:** 10-15 segundos

**Salida esperada:**
```
▲ Next.js 15.x.x
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000

✓ Ready in 3.2s
```

---

### PASO 7: Probar la Aplicación

#### 7.1 Abrir en el Navegador

Ve a: **http://localhost:3000**

Deberías ver:
- Página principal con "Bienvenido a UPIC"
- 1 tarjeta: "Universidad Nacional de Colombia"

#### 7.2 Explorar Restaurantes

1. Click en "Universidad Nacional de Colombia"
2. Deberías ver 3 restaurantes
3. Click en cualquiera para ver su menú (básico por ahora)

#### 7.3 Probar Endpoints API

Abre **Postman** o **Thunder Client** (extensión de VS Code):

**Test 1: Listar restaurantes**
```
GET http://localhost:3000/api/campus/universidad-nacional/restaurants
```

Deberías recibir JSON con los 3 restaurantes

**Test 2: Ver menú**
```
GET http://localhost:3000/api/restaurants/cafeteria-central/menu
```

Deberías recibir JSON con categorías y productos

---

### PASO 8: Configurar Supabase Auth (Email Magic Link)

#### 8.1 En Supabase Dashboard

1. Ve a **Authentication** (👤 en sidebar)
2. Click en **Providers**
3. Encuentra **Email**
4. Activa: ✓ **Enable Email provider**
5. Activa: ✓ **Confirm email**
6. Click **Save**

#### 8.2 Configurar URLs de Redirección

1. En **Authentication** > **URL Configuration**
2. **Site URL:** `http://localhost:3000`
3. **Redirect URLs:** Agregar:
   - `http://localhost:3000/auth/callback`
4. Click **Save**

#### 8.3 Probar Login

1. Ve a: http://localhost:3000/auth/login
2. Ingresa un email (puede ser de prueba)
3. Click "Enviar enlace mágico"
4. Revisa tu email (o la bandeja de Supabase si usas un email de prueba)
5. Click en el link

**💡 En desarrollo:** Supabase muestra los emails en la pestaña **Authentication** > **Logs**

---

## 🧪 VERIFICACIÓN FINAL

### Checklist de Funcionalidad

- [ ] `pnpm dev` inicia sin errores
- [ ] http://localhost:3000 carga correctamente
- [ ] Puedes ver la lista de universidades
- [ ] Puedes ver los restaurantes
- [ ] Los endpoints API responden
- [ ] Prisma Studio funciona (`pnpm db:studio`)

### Si TODO funciona:

**🎉 ¡FELICIDADES! El setup está completo.**

---

## 🐛 TROUBLESHOOTING Común

### Error: "Prisma Client not generated"
```bash
pnpm db:generate
```

### Error: "Can't reach database server"
- Verifica que `DATABASE_URL` en `.env` sea correcto
- Verifica la contraseña de Supabase
- Intenta desde Supabase Dashboard > SQL Editor ejecutar: `SELECT NOW();`

### Error: "Module not found"
```bash
rm -rf node_modules .next
pnpm install
```

### Puerto 3000 ocupado
```bash
# Usar otro puerto
PORT=3001 pnpm dev
```

### Error al hacer seed
```bash
# Limpiar y reintentar
pnpm db:push --force-reset
pnpm db:seed
```

---

## 📞 NECESITAS AYUDA?

1. **Revisa los logs** en la terminal donde corre `pnpm dev`
2. **Verifica `.env`** - 90% de errores vienen de aquí
3. **Prisma Studio** para ver la DB: `pnpm db:studio`
4. **Consola del navegador** (F12) para errores de frontend

---

## 📚 PRÓXIMOS PASOS (Opcional - Desarrollo)

Una vez funcionando, puedes:

1. **Personalizar el seed** (`scripts/seed.ts`)
2. **Agregar más productos** vía Prisma Studio
3. **Configurar Resend** para emails reales
4. **Configurar WhatsApp** para notificaciones
5. **Desplegar en Vercel** (ver `DEPLOYMENT.md`)

---

**IMPORTANTE:** Guarda bien tu `.env` - NUNCA lo subas a Git.

**¿Todo listo?** Continúa con `QUICKSTART.md` para ver cómo usar la aplicación.

