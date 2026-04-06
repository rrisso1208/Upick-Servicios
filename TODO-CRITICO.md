# ⚠️ ACCIONES CRÍTICAS QUE DEBES HACER TÚ

## 🔴 PASOS OBLIGATORIOS (Sin estos, nada funciona)

### 1. Instalar Dependencias (5 min)

```bash
cd upic
pnpm install
```

**Si no tienes pnpm:**
```bash
npm install -g pnpm
```

**Alternativa con npm:**
```bash
npm install
```

---

### 2. Crear Cuenta Supabase (10 min) ⭐ CRÍTICO

#### Por qué lo necesitas:
- Base de datos PostgreSQL (gratis hasta 500MB)
- Sistema de autenticación
- Storage para archivos

#### Paso a paso:

1. **Ir a:** https://supabase.com
2. **Click:** "Start your project"
3. **Registrarse** con GitHub o email
4. **Crear proyecto:**
   - Nombre: `upic-dev`
   - Password: **Guárdala bien** (la necesitarás en el .env)
   - Region: South America (São Paulo)
5. **Esperar** 1-2 minutos

#### Obtener credenciales:

Una vez creado:
1. Ve a **Settings** → **API**
2. Copia:
   - ✅ `Project URL`
   - ✅ `anon public key`
   - ✅ `service_role key`
3. Ve a **Settings** → **Database**
4. Copia:
   - ✅ `Connection string` → URI

**Guarda estas 4 cosas en un archivo temporal**

---

### 3. Crear Cuenta Wompi - Sandbox (5 min) ⭐ CRÍTICO

#### Por qué lo necesitas:
- Procesar pagos (PSE y Tarjeta)
- Sin esto, no puedes completar pedidos

#### Paso a paso:

1. **Ir a:** https://comercios.wompi.co/signup
2. **Registrarse** (gratis)
3. **Verificar email**
4. **Activar modo Sandbox:**
   - Configuración → Modo de pruebas
5. **Copiar keys:**
   - `Llave pública de pruebas` (pub_test_...)
   - `Llave privada de pruebas` (prv_test_...)

**Por ahora no necesitas configurar webhooks (lo haremos después)**

---

### 4. Configurar .env (10 min) ⭐ MUY CRÍTICO

Este es el archivo MÁS IMPORTANTE. Sin él, NADA funciona.

#### Crear el archivo:

```bash
# En la carpeta upic/
cp .env.example .env
```

#### Editar con tus credenciales:

Abre `upic/.env` y REEMPLAZA:

```env
# ====================
# 1. APP
# ====================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# ====================
# 2. SUPABASE (de tu cuenta Supabase)
# ====================
NEXT_PUBLIC_SUPABASE_URL=https://TUPROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...PEGA-TU-ANON-KEY-AQUI
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...PEGA-TU-SERVICE-KEY-AQUI

# ====================
# 3. DATABASE (de Supabase)
# ====================
# Formato: postgresql://postgres:PASSWORD@db.PROYECTO.supabase.co:5432/postgres
DATABASE_URL=postgresql://postgres:TU-PASSWORD-AQUI@db.TUPROYECTO.supabase.co:5432/postgres

# ====================
# 4. WOMPI (de tu cuenta Wompi)
# ====================
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_test_PEGA-TU-KEY-AQUI
WOMPI_PRIVATE_KEY=prv_test_PEGA-TU-KEY-AQUI
WOMPI_WEBHOOK_SECRET=cualquier-texto-random-123
WOMPI_API_URL=https://sandbox.wompi.co/v1

# ====================
# 5. OPCIONALES (puedes comentar por ahora)
# ====================
# RESEND_API_KEY=
# WHATSAPP_META_TOKEN=
# SENTRY_DSN=

# ====================
# 6. CONFIG
# ====================
DEFAULT_COMMISSION_RATE=0.04
COMMISSION_BASE_MODE=subtotal_plus_tax
```

#### ⚠️ VERIFICA:

- [ ] Reemplazaste TODAS las URLs y keys
- [ ] No hay espacios antes/después del `=`
- [ ] Las URLs NO terminan en `/`
- [ ] La contraseña de DATABASE_URL está correcta
- [ ] El archivo se llama exactamente `.env` (no `.env.txt`)

---

### 5. Configurar Base de Datos (3 min)

```bash
# Paso 1: Generar cliente Prisma
pnpm db:generate

# Paso 2: Crear tablas en Supabase
pnpm db:push

# Paso 3: Poblar con datos de prueba
pnpm db:seed
```

**Salida esperada del seed:**
```
🌱 Starting database seed...
✅ University created: Universidad Nacional de Colombia
✅ Created 3 restaurants
✅ Menu items created
✅ Commission policy created (4% global)
✅ Test users created
🎉 Seed completed successfully!
```

**Si algo falla aquí:**
- 90% del tiempo es porque el `.env` está mal
- Verifica el `DATABASE_URL` letra por letra
- Verifica que la contraseña no tenga caracteres especiales

---

### 6. Ejecutar el Servidor (2 min)

```bash
pnpm dev
```

**Deberías ver:**
```
▲ Next.js 15.x.x
- Local:        http://localhost:3000

✓ Ready in 3.2s
```

---

### 7. Probar en el Navegador (2 min)

1. Abre: **http://localhost:3000**
2. Deberías ver: "Bienvenido a UPIC"
3. Click en "Universidad Nacional de Colombia"
4. Deberías ver 3 restaurantes

**Si ves esto, ¡TODO FUNCIONA! 🎉**

---

## 🟡 PASOS OPCIONALES (Mejoran la experiencia)

### 8. Configurar Supabase Auth (5 min)

Para que el login con email funcione:

1. En Supabase → **Authentication** → **Providers**
2. Activar: ✅ **Email**
3. En **URL Configuration:**
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`
4. Guardar

Ahora puedes probar:
- http://localhost:3000/auth/login

---

### 9. Ver Base de Datos (Prisma Studio)

```bash
pnpm db:studio
```

Abre: http://localhost:5555

Aquí puedes:
- Ver todas las tablas
- Editar datos manualmente
- Verificar que el seed funcionó

---

## 🟢 VERIFICACIÓN FINAL

### Checklist de Éxito:

- [ ] `pnpm install` completó sin errores
- [ ] Archivo `.env` creado y configurado
- [ ] `pnpm db:generate` funcionó
- [ ] `pnpm db:push` creó las tablas
- [ ] `pnpm db:seed` insertó datos de prueba
- [ ] `pnpm dev` corre sin errores
- [ ] http://localhost:3000 muestra la app
- [ ] Puedo ver los restaurantes
- [ ] Prisma Studio funciona (`pnpm db:studio`)

### Si TODOS están ✅:

**¡FELICIDADES! 🚀**

Tu instalación está completa. Ahora puedes:
1. Explorar la app
2. Leer `NEXT-FEATURES.md` para ver qué implementar
3. Comenzar a desarrollar

---

## 🔴 Si algo NO funciona:

### Error más común: "Prisma Client not generated"

```bash
pnpm db:generate
```

### Error: "Can't reach database"

1. Verifica el `DATABASE_URL` en `.env`
2. Copia de nuevo desde Supabase
3. Asegúrate de reemplazar `[YOUR-PASSWORD]`

### Error: "Module not found"

```bash
rm -rf node_modules .next
pnpm install
pnpm db:generate
```

### Puerto 3000 ocupado

```bash
PORT=3001 pnpm dev
```

### Nada funciona y estás frustrado

1. **Borra todo y empieza de nuevo:**
   ```bash
   rm -rf node_modules .next
   pnpm install
   ```

2. **Verifica el `.env` línea por línea**
   - Este es el 90% de los problemas

3. **Revisa los logs** en la terminal donde corre `pnpm dev`

4. **Usa Prisma Studio** para ver si las tablas se crearon:
   ```bash
   pnpm db:studio
   ```

---

## 📊 Tiempo Total Estimado

| Tarea | Tiempo |
|-------|--------|
| Instalar dependencias | 5 min |
| Crear cuenta Supabase | 10 min |
| Crear cuenta Wompi | 5 min |
| Configurar .env | 10 min |
| Setup base de datos | 3 min |
| Ejecutar y probar | 2 min |
| **TOTAL** | **~35 min** |

---

## 🎯 ¿Qué sigue después?

Una vez que TODO funcione:

1. **Leer:** `NEXT-FEATURES.md`
2. **Implementar:** Checkout completo (primera prioridad)
3. **Mejorar:** Realtime updates
4. **Expandir:** CRUD de menú
5. **Desplegar:** Ver `DEPLOYMENT.md`

---

## 💡 Consejos Pro

1. **Guarda tu `.env` en un lugar seguro** (pero NUNCA en Git)
2. **Usa Prisma Studio** para entender la base de datos
3. **Revisa los logs** cuando algo falle
4. **Lee el código** - está bien documentado
5. **Experimenta** - puedes borrar y recrear la DB con `pnpm db:push --force-reset`

---

## 🆘 Última Parada

Si después de TODO esto algo no funciona:

1. Verifica que Node.js >= 20
2. Verifica que pnpm esté instalado
3. Verifica que `.env` existe y tiene tus credenciales
4. Verifica que Supabase esté corriendo (ve al dashboard)
5. Revisa TODOS los logs

**El 99% de problemas vienen del `.env` mal configurado.**

---

**¡Suerte! Tienes todo listo para empezar. 🚀**

