# 🔍 Verificar Variables de Entorno en Vercel

## Pasos para Verificar y Corregir

### 1. Acceder a Vercel Dashboard

1. Ve a [vercel.com](https://vercel.com)
2. Inicia sesión con tu cuenta
3. Selecciona el proyecto `upic` o `upick-xi`

### 2. Verificar Variables de Entorno

1. Ve a **Settings** → **Environment Variables**
2. Verifica que estas variables estén configuradas:

#### Variables CRÍTICAS (deben estar todas):

```
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://upick-xi.vercel.app
NODE_ENV=production
```

### 3. Verificar el Formato de DATABASE_URL

La `DATABASE_URL` debe tener este formato:

```
postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?pgbouncer=true&connection_limit=1
```

**Importante:**

- Reemplaza `[PASSWORD]` con tu contraseña real de Supabase
- Reemplaza `[HOST]` con el host de tu base de datos Supabase
- El parámetro `pgbouncer=true` es importante para Vercel
- El parámetro `connection_limit=1` ayuda a evitar problemas de conexión

### 4. Obtener DATABASE_URL desde Supabase

1. Ve a tu proyecto en [supabase.com](https://supabase.com)
2. Ve a **Settings** → **Database**
3. Busca la sección **Connection string**
4. Selecciona **URI** o **Connection pooling**
5. Copia la URL completa
6. Asegúrate de incluir tu contraseña real

### 5. Agregar/Actualizar Variables en Vercel

1. En Vercel, ve a **Settings** → **Environment Variables**
2. Para cada variable:
   - Si existe: Haz clic en ella y actualiza el valor
   - Si no existe: Haz clic en **Add New** y agrega:
     - **Name**: El nombre de la variable (ej: `DATABASE_URL`)
     - **Value**: El valor de la variable
     - **Environment**: Selecciona `Production`, `Preview`, y `Development`

### 6. Redesplegar Después de Cambios

**MUY IMPORTANTE:** Después de agregar o modificar variables de entorno:

1. Ve a **Deployments**
2. Encuentra el último deployment
3. Haz clic en los **3 puntos** (⋯)
4. Selecciona **Redeploy**
5. O simplemente haz un nuevo commit y push

### 7. Verificar los Logs

1. Ve a **Deployments**
2. Selecciona el último deployment
3. Haz clic en **View Function Logs** o **View Build Logs**
4. Busca errores relacionados con:
   - `DATABASE_URL`
   - `Prisma`
   - `Connection`
   - `ECONNREFUSED`
   - `P1001`

## Errores Comunes y Soluciones

### Error: "DATABASE_URL is not configured"

**Solución:** Agrega la variable `DATABASE_URL` en Vercel Environment Variables

### Error: "Can't reach database server"

**Solución:**

- Verifica que la contraseña en `DATABASE_URL` sea correcta
- Verifica que el host de Supabase sea correcto
- Asegúrate de que tu base de datos Supabase esté activa

### Error: "Connection pool timeout"

**Solución:**

- Agrega `?pgbouncer=true&connection_limit=1` al final de `DATABASE_URL`
- Verifica que estés usando Connection Pooling de Supabase

### Error: "SSL connection required"

**Solución:**

- Agrega `?sslmode=require` al final de `DATABASE_URL`
- O usa la URL de Connection Pooling que ya incluye SSL

## Formato Correcto de DATABASE_URL

### Opción 1: Connection Pooling (Recomendado para Vercel)

```
postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

### Opción 2: Direct Connection

```
postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres?sslmode=require
```

## Checklist de Verificación

- [ ] `DATABASE_URL` está configurada en Vercel
- [ ] `DATABASE_URL` incluye la contraseña correcta
- [ ] `DATABASE_URL` usa el formato correcto (postgresql://...)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` está configurada
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` está configurada
- [ ] `SUPABASE_SERVICE_ROLE_KEY` está configurada
- [ ] `NEXT_PUBLIC_APP_URL` está configurada con la URL de Vercel
- [ ] `NODE_ENV` está configurada como `production`
- [ ] Todas las variables están en los 3 ambientes (Production, Preview, Development)
- [ ] Se hizo redeploy después de agregar/modificar variables

## Prueba Rápida

Después de configurar todo, puedes verificar que funciona:

1. Ve a tu aplicación en Vercel
2. Abre la consola del navegador (F12)
3. Busca errores relacionados con base de datos
4. Si el error persiste, revisa los logs de Vercel

## Contacto de Soporte

Si después de seguir estos pasos el problema persiste:

1. Revisa los logs de Vercel en detalle
2. Verifica que Supabase esté funcionando (ve al Dashboard de Supabase)
3. Prueba ejecutar una query simple en Supabase SQL Editor
