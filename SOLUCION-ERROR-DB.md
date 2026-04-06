# 🔧 Solución: Error de Conexión a Base de Datos en Vercel

## ✅ Variables que YA tienes configuradas:

- ✅ NEXT_PUBLIC_SUPABASE_URL
- ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
- ✅ SUPABASE_SERVICE_ROLE_KEY
- ✅ DATABASE_URL
- ✅ NEXT_PUBLIC_WOMPI_PUBLIC_KEY
- ✅ WOMPI_PRIVATE_KEY
- ✅ WOMPI_WEBHOOK_SECRET

## ⚠️ Variables que FALTAN (pueden causar problemas):

### Críticas:

- ❌ `WOMPI_API_URL` = `https://sandbox.wompi.co/v1`
- ❌ `NEXT_PUBLIC_APP_URL` = `https://upick-xi.vercel.app` (o tu dominio)
- ❌ `NODE_ENV` = `production`

### Opcionales pero recomendadas:

- ❌ `DEFAULT_COMMISSION_RATE` = `0.04`
- ❌ `COMMISSION_BASE_MODE` = `subtotal_plus_tax`

---

## 🔍 PASOS PARA SOLUCIONAR:

### Paso 1: Verificar DATABASE_URL

El `DATABASE_URL` debe tener este formato exacto:

```
postgresql://postgres.rcysmzhiyaaaqkicgqyz:20%23M4ch4d3l@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**IMPORTANTE:**

- ✅ Debe usar puerto **6543** (Session Pooler)
- ✅ Debe tener `?pgbouncer=true` al final
- ✅ El password debe estar URL-encoded (el `#` se convierte en `%23`)

**Verifica en Vercel:**

1. Ve a Settings → Environment Variables
2. Click en `DATABASE_URL`
3. Verifica que tenga el formato correcto
4. Si está mal, edítala y guarda

---

### Paso 2: Agregar Variables Faltantes

Agrega estas variables en Vercel:

1. **WOMPI_API_URL**
   - Valor: `https://sandbox.wompi.co/v1`
   - Scope: Production, Preview, Development

2. **NEXT_PUBLIC_APP_URL**
   - Valor: `https://upick-xi.vercel.app` (o tu dominio actual)
   - Scope: Production, Preview, Development

3. **NODE_ENV**
   - Valor: `production`
   - Scope: Production

4. **DEFAULT_COMMISSION_RATE** (opcional)
   - Valor: `0.04`
   - Scope: Production

5. **COMMISSION_BASE_MODE** (opcional)
   - Valor: `subtotal_plus_tax`
   - Scope: Production

---

### Paso 3: HACER REDEPLOY (CRÍTICO)

**Después de agregar/editar variables, DEBES hacer un redeploy:**

1. Ve a **Deployments** en Vercel
2. Encuentra el último deployment
3. Click en los **3 puntos** (⋯)
4. Click en **"Redeploy"**
5. Espera 2-5 minutos

**O desde la terminal:**

```bash
vercel --prod
```

---

### Paso 4: Verificar Logs

Si sigue fallando, revisa los logs:

1. Ve a **Deployments**
2. Click en el último deployment
3. Click en **"View Function Logs"**
4. Busca errores relacionados con `DATABASE_URL` o `Prisma`

---

## 🐛 Problemas Comunes:

### Error: "DATABASE_URL is not configured"

- **Causa:** La variable no está en el entorno correcto
- **Solución:** Verifica que `DATABASE_URL` esté en **Production** scope

### Error: "Connection timeout"

- **Causa:** El `DATABASE_URL` no usa Session Pooler (puerto 6543)
- **Solución:** Cambia el puerto a `6543` y agrega `?pgbouncer=true`

### Error: "Authentication failed"

- **Causa:** Password incorrecto o mal codificado
- **Solución:** Verifica el password en Supabase y asegúrate de que esté URL-encoded

---

## ✅ Checklist Final:

- [ ] `DATABASE_URL` tiene puerto 6543 y `?pgbouncer=true`
- [ ] `DATABASE_URL` está en scope **Production**
- [ ] Agregaste `WOMPI_API_URL`
- [ ] Agregaste `NEXT_PUBLIC_APP_URL`
- [ ] Agregaste `NODE_ENV=production`
- [ ] Hiciste **Redeploy** después de agregar variables
- [ ] Esperaste 2-5 minutos para que termine el deploy
- [ ] Revisaste los logs si sigue fallando

---

**Si después de todo esto sigue fallando, comparte los logs del deployment para diagnosticar mejor.**
