# 🚀 Setup GitHub + Vercel - Upick

**Objetivo:** Subir el proyecto a GitHub y conectarlo con Vercel para deploy automático

**Tiempo:** 15 minutos

---

## 📋 **PASO 1: CREAR REPO NUEVO EN GITHUB (3 min)**

### **1.1 Ir a GitHub:**
```
https://github.com/new
```

### **1.2 Configurar repo:**
- **Repository name:** `upick`
- **Description:** "Sistema de pedidos para restaurantes universitarios"
- **Visibility:** Private (recomendado) ⭐
- **NO marques:**
  - ❌ Add README
  - ❌ Add .gitignore
  - ❌ Choose license

### **1.3 Click "Create repository"**

Verás instrucciones, pero las ignoraremos y usaremos las mías ⬇️

---

## 📦 **PASO 2: PREPARAR PROYECTO LOCAL (5 min)**

### **2.1 Limpiar Git actual:**

El proyecto tiene un Git configurado incorrectamente. Vamos a empezar limpio:

```bash
# Ir a la carpeta upic
cd C:\Users\ACER\Documents\upic

# Eliminar el .git antiguo (SOLO si está mal configurado)
Remove-Item -Recurse -Force .git

# Inicializar Git nuevo
git init
```

### **2.2 Configurar .gitignore:**

Asegúrate de que existe `.gitignore` con este contenido:

```
# Dependencies
node_modules/
.pnpm-store/

# Next.js
.next/
out/
build/
dist/

# Environment
.env
.env.local
.env.*.local
.env.production

# Logs
*.log
npm-debug.log*
pnpm-debug.log*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Testing
coverage/
.nyc_output/

# Misc
*.pem
.vercel
```

### **2.3 Agregar archivos:**

```bash
# Agregar todos los archivos del proyecto
git add .

# Ver qué se va a subir (opcional)
git status

# Hacer commit inicial
git commit -m "Initial commit - Upick MVP"
```

---

## 🔗 **PASO 3: CONECTAR CON GITHUB (2 min)**

```bash
# Conectar con tu repo (REEMPLAZA con tu URL real)
git remote add origin https://github.com/TU-USUARIO/upick.git

# Cambiar branch a main
git branch -M main

# Subir código
git push -u origin main
```

**Si te pide credenciales:**
- Usuario: Tu usuario de GitHub
- Password: **Personal Access Token** (no tu contraseña)

### **Crear Personal Access Token:**
```
GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
→ Generate new token
→ Permisos: repo (todos)
→ Copiar el token y usarlo como password
```

---

## 🚀 **PASO 4: CONECTAR VERCEL (5 min)**

### **4.1 Ir a Vercel:**
```
https://vercel.com/signup
```

### **4.2 Login con GitHub:**
- Click "Continue with GitHub"
- Autoriza Vercel

### **4.3 Importar proyecto:**
- Click "Add New..." → "Project"
- Busca tu repo "upick"
- Click "Import"

### **4.4 Configurar:**

**Framework Preset:** Next.js (detectado automáticamente)

**Root Directory:** `./`

**Build Command:** (dejar vacío, usará el default)

**Environment Variables:** Agregar TODAS estas ⬇️

---

## ⚙️ **PASO 5: VARIABLES DE ENTORNO (5 min)**

En Vercel, sección "Environment Variables":

```env
# SUPABASE
NEXT_PUBLIC_SUPABASE_URL=https://tuproyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui

# DATABASE (usa Session Pooler - puerto 6543)
DATABASE_URL=postgresql://postgres:PASSWORD@db.PROYECTO.supabase.co:6543/postgres?pgbouncer=true

# WOMPI
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_test_hTtjwSkjkwrnXtGQ48Y3iwkMBJDMMjBb
WOMPI_PRIVATE_KEY=prv_test_eo1oEoziexIkUAueF8vZdHN76VaLbRpM
WOMPI_WEBHOOK_SECRET=test_events_oDUjbkCQzuwUWKm8pfHe1VeqSEG2yL8R
WOMPI_API_URL=https://sandbox.wompi.co/v1

# APP (lo actualizaremos después)
NEXT_PUBLIC_APP_URL=https://upick.vercel.app
NODE_ENV=production

# COMISIONES
DEFAULT_COMMISSION_RATE=0.04
COMMISSION_BASE_MODE=subtotal_plus_tax
```

**⚠️ IMPORTANTE:**
- El `DATABASE_URL` DEBE usar puerto **6543** (Session Pooler)
- Copia el `NEXT_PUBLIC_APP_URL` lo actualizaremos después

---

## 🎉 **PASO 6: DEPLOY (2 min)**

1. Click **"Deploy"**
2. Espera 2-3 minutos
3. ¡Verás tu app en vivo! 🎉

---

## 🔄 **PASO 7: ACTUALIZAR URL Y REDEPLOY (2 min)**

### **7.1 Obtén tu URL real:**

Vercel te dará algo como:
```
https://upick-abc123.vercel.app
```

### **7.2 Actualiza la variable:**

Vercel → Settings → Environment Variables → Edita:
```
NEXT_PUBLIC_APP_URL=https://upick-abc123.vercel.app
```

### **7.3 Redeploy:**

Vercel → Deployments → Click los 3 puntos → "Redeploy"

---

## 🔔 **PASO 8: CONFIGURAR WEBHOOK WOMPI (2 min)**

Ahora que tienes URL real:

1. Dashboard Wompi → Programadores
2. URL de Eventos:
   ```
   https://tu-url-vercel.vercel.app/api/payments/webhook
   ```
3. Click "Guardar"

---

## ✅ **PASO 9: PROBAR TODO (5 min)**

Abre tu app:
```
https://tu-proyecto.vercel.app
```

**Haz un pedido completo:**
1. Selecciona universidad
2. Elige restaurante
3. Agrega productos
4. Ve al checkout
5. Paga con: 4242 4242 4242 4242
6. ¡Debería funcionar perfectamente!

---

## 🔄 **WORKFLOW DIARIO (De ahora en adelante)**

### **Para trabajar en el proyecto:**

```bash
# 1. Hacer cambios en tu código local
# (editas archivos, agregas features, etc.)

# 2. Ver cambios
git status

# 3. Agregar cambios
git add .

# 4. Commit
git commit -m "Descripción de tus cambios"

# 5. Subir a GitHub
git push

# 6. Vercel despliega AUTOMÁTICAMENTE en 2 minutos
# No necesitas hacer nada más! 🎉
```

### **Para ver el deploy:**
```
Vercel Dashboard → Ver progreso en tiempo real
```

---

## 🎯 **VENTAJAS DE ESTE SETUP**

| Acción | Resultado |
|--------|-----------|
| `git push` | ✅ Deploy automático a Vercel |
| Crear branch | ✅ Preview URL único |
| Pull Request | ✅ Preview automático |
| Merge a main | ✅ Deploy a producción |
| Rollback | ✅ 1 click en Vercel |

---

## 🌿 **BRANCHES RECOMENDADOS**

```bash
# Branch principal (producción)
main

# Branch de desarrollo
git checkout -b development

# Branches de features
git checkout -b feature/nueva-funcionalidad
```

**Workflow:**
1. Desarrollas en `feature/`
2. Merge a `development` → Preview URL
3. Si funciona, merge a `main` → Producción

---

## 🐛 **SOLUCIÓN DE PROBLEMAS**

### **Error: "Permission denied (publickey)"**
```bash
# Usa HTTPS en lugar de SSH:
git remote set-url origin https://github.com/TU-USUARIO/upick.git
```

### **Error: "Prisma Client not generated"**
```
Vercel → Settings → General → Build & Development Settings
Build Command: pnpm install && pnpm db:generate && pnpm build
```

### **Error: "Database connection failed"**
```
1. Verifica DATABASE_URL use puerto 6543
2. Formato correcto:
   postgresql://postgres:PASS@db.PROJ.supabase.co:6543/postgres?pgbouncer=true
```

### **Vercel no detecta cambios:**
```bash
# Force push
git commit --allow-empty -m "Trigger deploy"
git push
```

---

## 🎨 **DOMINIOS PERSONALIZADOS (Opcional)**

Cuando estés listo:

1. Vercel → Settings → Domains
2. Agregar: `upick.app` o tu dominio
3. Configurar DNS según instrucciones
4. ✅ SSL automático

---

## 📊 **MONITOREO**

Vercel incluye:
- ✅ **Analytics** - Ver tráfico real
- ✅ **Logs** - Debugging en tiempo real
- ✅ **Speed Insights** - Performance
- ✅ **Error tracking** - Errores automáticos

---

## ✨ **RESULTADO FINAL**

Tendrás:
- ✅ Código seguro en GitHub
- ✅ App en producción con Vercel
- ✅ Deploy automático con cada push
- ✅ Historial completo de cambios
- ✅ Rollback fácil si algo falla
- ✅ Preview URLs para testing
- ✅ SSL y CDN global automáticos

---

**¡Listo para empezar!** 🚀


