# 🚀 Agregar ENCRYPTION_KEY a Vercel

## 📋 Pasos Detallados

### Paso 1: Acceder a Vercel Dashboard

1. Ve a [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Inicia sesión con tu cuenta
3. Busca y selecciona tu proyecto **Upick** (o el nombre que le hayas dado)

### Paso 2: Ir a Settings

1. Una vez dentro del proyecto, haz clic en la pestaña **"Settings"** (Configuración)
2. En el menú lateral izquierdo, busca y haz clic en **"Environment Variables"** (Variables de Entorno)

### Paso 3: Agregar la Variable

1. Verás un formulario con tres campos:
   - **Name** (Nombre)
   - **Value** (Valor)
   - **Environment** (Ambiente)

2. Completa el formulario:
   - **Name:** `ENCRYPTION_KEY`
   - **Value:** `e67d578310aad8db53a858328f95d1091198b2b70c20da3dccf00fc318594a42`
   - **Environment:** Selecciona **todas las opciones**:
     - ✅ Production
     - ✅ Preview
     - ✅ Development

3. Haz clic en el botón **"Add"** o **"Save"**

### Paso 4: Verificar

1. Deberías ver la variable `ENCRYPTION_KEY` en la lista de variables de entorno
2. Verifica que esté configurada para los tres ambientes (Production, Preview, Development)

### Paso 5: Redeploy (Importante)

**⚠️ CRÍTICO:** Después de agregar la variable, debes hacer un redeploy para que tome efecto:

1. Ve a la pestaña **"Deployments"** (Despliegues)
2. Encuentra el último deployment
3. Haz clic en los **tres puntos** (⋯) a la derecha
4. Selecciona **"Redeploy"**
5. Confirma el redeploy

**O alternativamente:**

1. Haz un pequeño cambio en tu código (por ejemplo, un comentario)
2. Haz commit y push a Git
3. Vercel desplegará automáticamente con las nuevas variables

## 🔍 Verificación Rápida

Para verificar que la variable está configurada correctamente después del redeploy:

1. Ve a **Deployments**
2. Haz clic en el último deployment
3. Ve a la pestaña **"Logs"**
4. Busca en los logs si hay algún error relacionado con `ENCRYPTION_KEY`

O puedes agregar temporalmente este código para verificar:

```typescript
// En cualquier API route o server component
console.log('ENCRYPTION_KEY configurada:', !!process.env.ENCRYPTION_KEY);
```

## 📸 Ubicación Visual

```
Vercel Dashboard
└── Tu Proyecto (Upick)
    └── Settings (Configuración)
        └── Environment Variables (Variables de Entorno)
            └── [Formulario para agregar]
                ├── Name: ENCRYPTION_KEY
                ├── Value: e67d578310aad8db53a858328f95d1091198b2b70c20da3dccf00fc318594a42
                └── Environment: ✅ Production ✅ Preview ✅ Development
```

## ⚠️ Importante

- ✅ La misma clave que usaste en `.env` local
- ✅ Debe estar en los tres ambientes (Production, Preview, Development)
- ✅ Después de agregar, **siempre hacer redeploy**
- ❌ No compartas esta clave públicamente
- ❌ No la subas a Git (ya está en `.gitignore`)

## 🆘 Si Tienes Problemas

### La variable no aparece después del redeploy

1. Verifica que la agregaste correctamente
2. Asegúrate de haber seleccionado todos los ambientes
3. Espera unos minutos y vuelve a intentar el redeploy
4. Revisa los logs del deployment para ver errores

### Error de encriptación en producción

1. Verifica que la clave tiene exactamente 64 caracteres
2. Asegúrate de que no hay espacios al inicio o final
3. Verifica que esté en formato hexadecimal (solo 0-9, a-f)

---

**Última actualización:** Diciembre 2024

