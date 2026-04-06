# 🔐 Configurar ENCRYPTION_KEY

## ✅ Claves Generadas

Has generado dos claves válidas. Usa **una de ellas**:

**Opción 1:**
```
e67d578310aad8db53a858328f95d1091198b2b70c20da3dccf00fc318594a42
```

**Opción 2:**
```
4f3747e46f1213f4b5910386b2da5783b2b54ffe4acba424896df96d9467c37c
```

## 📝 Pasos para Configurar

### 1. Agregar a `.env` (Desarrollo Local)

Abre el archivo `.env` en la raíz del proyecto y agrega:

```bash
ENCRYPTION_KEY=e67d578310aad8db53a858328f95d1091198b2b70c20da3dccf00fc318594a42
```

**⚠️ IMPORTANTE:** 
- Usa **solo una** de las claves generadas
- **NO** compartas esta clave públicamente
- **NO** la subas a Git (debe estar en `.gitignore`)

### 2. Agregar a Vercel (Producción)

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto **Upick**
3. Ve a **Settings** → **Environment Variables**
4. Agrega nueva variable:
   - **Name:** `ENCRYPTION_KEY`
   - **Value:** `e67d578310aad8db53a858328f95d1091198b2b70c20da3dccf00fc318594a42`
   - **Environment:** Selecciona todas (Production, Preview, Development)
5. Click en **Save**
6. **Redeploy** tu aplicación para que tome la nueva variable

### 3. Verificar Configuración

Para verificar que la clave está configurada correctamente:

```bash
# En desarrollo local
node -e "console.log(process.env.ENCRYPTION_KEY ? '✅ Configurada' : '❌ No configurada')"
```

O simplemente reinicia tu servidor de desarrollo:

```bash
pnpm dev
```

Si la clave no está configurada, verás un warning en los logs.

## 🔒 Seguridad

- ✅ La clave tiene 64 caracteres hexadecimales (32 bytes)
- ✅ Es aleatoria y única
- ✅ Debe mantenerse secreta
- ✅ No debe estar en el código fuente
- ✅ Debe estar en variables de entorno

## 🚨 Si Necesitas Generar Otra Clave

Si necesitas generar una nueva clave (por ejemplo, si se comprometió):

```bash
# En PowerShell (Windows)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# En Linux/Mac
openssl rand -hex 32
```

**⚠️ ADVERTENCIA:** Si cambias la clave de encriptación, **NO podrás desencriptar** los datos que fueron encriptados con la clave anterior. Asegúrate de hacer backup antes de cambiar.

## ✅ Listo

Una vez configurada la variable de entorno, la encriptación funcionará automáticamente. Los datos sensibles se encriptarán al guardar y se desencriptarán al leer.

---

**Última actualización:** Diciembre 2024

