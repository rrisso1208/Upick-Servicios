# 🚀 Deploy Rápido a Vercel - Upick

**Tiempo estimado:** 15 minutos

---

## 📋 **REQUISITOS PREVIOS**

- [x] Proyecto en GitHub (o crear repo nuevo)
- [x] Cuenta Vercel (gratis)
- [x] Credenciales de Supabase
- [x] Credenciales de Wompi

---

## 🎯 **PASO 1: PREPARAR GITHUB (5 min)**

### **Opción A: Si NO tienes repo de GitHub:**

```bash
# 1. Inicializar Git (si no está)
git init

# 2. Agregar todos los archivos
git add .

# 3. Commit inicial
git commit -m "Initial commit - Upick MVP"

# 4. Crear repo en GitHub
# Ve a: https://github.com/new
# Nombre: upick
# Privado: Sí (recomendado)
# NO inicialices con README

# 5. Conectar y subir
git remote add origin https://github.com/TU-USUARIO/upick.git
git branch -M main
git push -u origin main
```

### **Opción B: Si YA tienes repo:**

```bash
# Solo asegúrate de tener los últimos cambios
git add .
git commit -m "Ready for Vercel deploy"
git push
```

---

## 🚀 **PASO 2: DEPLOY EN VERCEL (5 min)**

### **1. Ir a Vercel:**
```
https://vercel.com/signup
```

### **2. Login con GitHub**
- Click "Continue with GitHub"
- Autoriza Vercel

### **3. Importar Proyecto:**
- Click "Add New..." → "Project"
- Selecciona tu repositorio "upick"
- Click "Import"

### **4. Configurar:**
- **Framework Preset:** Next.js (detectado automáticamente)
- **Root Directory:** ./ (dejar por defecto)
- **Build Command:** `pnpm build` (o dejar vacío)
- **Output Directory:** .next (automático)

### **5. NO hagas click en Deploy todavía**
Primero configuramos las variables de entorno ⬇️

---

## ⚙️ **PASO 3: CONFIGURAR VARIABLES DE ENTORNO (3 min)**

En la sección **"Environment Variables"** de Vercel:

### **Variables Críticas:**

```env
# SUPABASE
NEXT_PUBLIC_SUPABASE_URL=https://tuproyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-key

# DATABASE
DATABASE_URL=postgresql://postgres:password@db.tuproyecto.supabase.co:6543/postgres?pgbouncer=true

# WOMPI
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_test_hTtjwSkjkwrnXtGQ48Y3iwkMBJDMMjBb
WOMPI_PRIVATE_KEY=prv_test_eo1oEoziexIkUAueF8vZdHN76VaLbRpM
WOMPI_WEBHOOK_SECRET=test_events_oDUjbkCQzuwUWKm8pfHe1VeqSEG2yL8R
WOMPI_API_URL=https://sandbox.wompi.co/v1

# APP
NEXT_PUBLIC_APP_URL=https://tu-proyecto.vercel.app
NODE_ENV=production

# COMISIONES
DEFAULT_COMMISSION_RATE=0.04
COMMISSION_BASE_MODE=subtotal_plus_tax
```

**⚠️ IMPORTANTE:**
- Copia TODAS las variables de tu `.env` local
- La DATABASE_URL debe usar el **Session Pooler** (puerto 6543)
- El NEXT_PUBLIC_APP_URL lo obtendrás después del deploy (lo actualizaremos)

---

## 🎉 **PASO 4: DEPLOY (2 min)**

1. Click **"Deploy"**
2. Espera 2-3 minutos mientras Vercel:
   - Instala dependencias
   - Genera cliente Prisma
   - Compila Next.js
   - Optimiza assets
3. ¡Listo! 🎉

---

## 🔗 **PASO 5: OBTENER URL Y ACTUALIZAR (2 min)**

### **1. Obtén tu URL:**
```
https://upick-xyz123.vercel.app
```

### **2. Actualiza variables:**
En Vercel → Settings → Environment Variables:

Edita:
```
NEXT_PUBLIC_APP_URL=https://tu-url-real.vercel.app
```

### **3. Redeploy:**
- Vercel → Deployments → Click en los 3 puntos → "Redeploy"

---

## 🔔 **PASO 6: CONFIGURAR WEBHOOK EN WOMPI (3 min)**

Ahora que tienes URL real:

1. Ve a tu dashboard de Wompi
2. **Programadores** → **URL de Eventos**
3. Pega:
   ```
   https://tu-url-vercel.vercel.app/api/payments/webhook
   ```
4. Click **"Guardar"**

---

## ✅ **PASO 7: PROBAR TODO (5 min)**

Abre tu app en:
```
https://tu-proyecto.vercel.app
```

**Deberías ver:**
- ✅ Diseño perfecto (Tailwind funcionando)
- ✅ Página principal de Upick
- ✅ Universidad Nacional
- ✅ Restaurantes cargando

**Haz un pedido de prueba completo:**
1. Selecciona restaurante
2. Agrega productos
3. Ve al checkout
4. Paga con: 4242 4242 4242 4242
5. ¡Debería funcionar perfectamente!

---

## 🐛 **SOLUCIÓN DE PROBLEMAS**

### **Error: "Database connection failed"**
```
1. Verifica el DATABASE_URL
2. Usa el Session Pooler (puerto 6543)
3. Formato correcto:
   postgresql://postgres:PASS@db.PROJ.supabase.co:6543/postgres?pgbouncer=true
```

### **Error: "Prisma Client not generated"**
```
1. Vercel → Settings → General
2. Build & Development Settings
3. Build Command: pnpm install && pnpm db:generate && pnpm build
```

### **Error 500 en producción:**
```
1. Ve a Vercel → Functions → Logs
2. Revisa los logs para ver el error exacto
3. Probablemente falta una variable de entorno
```

---

## 🎯 **VENTAJAS DE VERCEL**

| Aspecto | Local | Vercel |
|---------|-------|--------|
| **Diseño** | ⚠️ A veces falla | ✅ Perfecto |
| **Performance** | ⚠️ Lento | ✅ Ultra rápido |
| **Webhooks** | ❌ Necesita ngrok | ✅ Funciona directo |
| **SSL** | ❌ No | ✅ Automático |
| **CDN** | ❌ No | ✅ Global |
| **Logs** | ⚠️ Terminal | ✅ Dashboard |
| **Escalabilidad** | ❌ No | ✅ Automática |

---

## 🚀 **SIGUIENTE NIVEL**

Después del deploy:

1. **Dominio personalizado:**
   - Vercel → Settings → Domains
   - Conecta tu dominio (ej: upick.app)

2. **Monitoreo:**
   - Vercel → Analytics
   - Ver tráfico en tiempo real

3. **Optimizaciones:**
   - Vercel detecta y optimiza automáticamente
   - Edge functions
   - Image optimization

---

## 💡 **TIPS PRO**

### **Deploy automático:**
- Cada push a GitHub despliega automáticamente
- Vercel crea preview para cada PR
- Rollback instantáneo si algo falla

### **Variables por ambiente:**
- Production: Wompi producción
- Preview: Wompi sandbox
- Facilita testing

### **Logs en tiempo real:**
```
Vercel → Functions → Ver logs específicos
Mucho mejor que console.log local
```

---

## ✨ **CHECKLIST FINAL**

- [ ] Proyecto en GitHub
- [ ] Deploy en Vercel exitoso
- [ ] Variables de entorno configuradas
- [ ] App cargando correctamente
- [ ] Diseño funcionando perfecto
- [ ] Webhook configurado en Wompi
- [ ] Pedido de prueba exitoso
- [ ] Pago procesado correctamente

---

## 🎉 **¡LISTO PARA PRODUCCIÓN!**

Tu app está:
- ✅ Desplegada globalmente
- ✅ Con SSL automático
- ✅ Optimizada para performance
- ✅ Con logs y monitoreo
- ✅ Lista para usuarios reales

**¡Felicitaciones! Tu MVP está en producción.** 🚀


