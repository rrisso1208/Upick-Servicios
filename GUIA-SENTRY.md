# 🚀 Guía Completa: Configuración de Sentry para Upick

**Fecha:** Diciembre 2024

---

## 📋 PASO 1: CREAR CUENTA EN SENTRY

### Opción A: Crear cuenta nueva (Recomendado)

1. **Ve a la página de registro:**
   - Abre tu navegador y ve a: https://sentry.io/signup/
   - O directamente: https://sentry.io/organizations/new/

2. **Elige método de registro:**
   - **Opción 1:** Registro con email
     - Ingresa tu email
     - Crea una contraseña
     - Confirma tu email
   - **Opción 2:** Registro con GitHub/Google
     - Click en "Sign up with GitHub" o "Sign up with Google"
     - Autoriza la aplicación
     - Se creará automáticamente

3. **Completa el perfil:**
   - Nombre de usuario
   - Nombre de la organización (ej: "upick" o "mi-empresa")
   - Selecciona el plan (elige "Developer" que es gratuito)

### Opción B: Usar cuenta existente

Si ya tienes cuenta en Sentry:

1. Ve a: https://sentry.io/auth/login/
2. Inicia sesión con tus credenciales

---

## 📋 PASO 2: CREAR PROYECTO

1. **Después de crear la cuenta, verás el dashboard**
   - Click en "Create Project" o "Create a Project"

2. **Selecciona la plataforma:**
   - Busca y selecciona **"Next.js"**
   - O busca "JavaScript" si no aparece Next.js

3. **Configura el proyecto:**
   - **Project Name:** `upick` (o el nombre que prefieras)
   - **Team:** Selecciona tu equipo (o crea uno nuevo)
   - Click en "Create Project"

4. **Copia el DSN:**
   - Después de crear el proyecto, Sentry te mostrará el **DSN**
   - Se ve algo así: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`
   - **¡GUARDA ESTE DSN!** Lo necesitarás después

---

## 📋 PASO 3: CONFIGURAR EN TU PROYECTO

### Paso 3.1: Agregar DSN a variables de entorno

1. **Abre tu archivo `.env.local`** (o `.env`):

```env
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
NEXT_PUBLIC_SENTRY_ENABLE_DEV=false
```

2. **Reemplaza `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`** con tu DSN real

3. **Si quieres ver errores en desarrollo:**

```env
NEXT_PUBLIC_SENTRY_ENABLE_DEV=true
```

### Paso 3.2: Agregar a Vercel (si estás usando Vercel)

1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Click en tu proyecto "upick"
3. Ve a **Settings** > **Environment Variables**
4. Agrega:
   - **Name:** `NEXT_PUBLIC_SENTRY_DSN`
   - **Value:** Tu DSN de Sentry
   - **Environment:** Production, Preview, Development (marca todos)
5. Click en "Save"

---

## 📋 PASO 4: EJECUTAR WIZARD DE SENTRY (Recomendado)

El wizard configurará automáticamente todo lo necesario:

1. **Abre tu terminal en la carpeta del proyecto:**

```bash
cd c:\Users\ACER\Documents\upic
```

2. **Ejecuta el wizard:**

```bash
npx @sentry/wizard@latest -i nextjs
```

3. **El wizard te preguntará:**
   - ✅ **Do you want to create a Sentry project?** → **No** (ya lo creaste)
   - ✅ **What's your Sentry DSN?** → Pega tu DSN
   - ✅ **Do you want to set up source maps?** → **Yes** (recomendado)
   - ✅ **Do you want to set up releases?** → **Yes** (recomendado)

4. **El wizard modificará automáticamente:**
   - `next.config.js` (agregará plugin de Sentry)
   - `sentry.properties` (creará archivo de configuración)
   - Actualizará los archivos de configuración de Sentry si es necesario

---

## 📋 PASO 5: VERIFICAR CONFIGURACIÓN

### Paso 5.1: Verificar que los archivos estén correctos

Verifica que estos archivos existan y tengan contenido:

- ✅ `sentry.client.config.ts`
- ✅ `sentry.server.config.ts`
- ✅ `sentry.edge.config.ts`
- ✅ `sentry.properties` (si ejecutaste el wizard)

### Paso 5.2: Probar que Sentry funciona

1. **Agrega un error de prueba temporalmente:**

Crea o modifica `src/app/test-sentry/page.tsx`:

```typescript
'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function TestSentryPage() {
  useEffect(() => {
    // Error de prueba
    try {
      throw new Error('Test Sentry Error - Esto es solo una prueba');
    } catch (error) {
      Sentry.captureException(error);
    }
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test de Sentry</h1>
      <p>Si ves este mensaje, la página se cargó correctamente.</p>
      <p className="mt-4 text-sm text-gray-600">
        Revisa tu dashboard de Sentry para ver el error de prueba.
      </p>
    </div>
  );
}
```

2. **Visita la página:**
   - Ve a: http://localhost:3000/test-sentry
   - O en producción: https://tu-dominio.com/test-sentry

3. **Verifica en Sentry:**
   - Ve a tu dashboard de Sentry: https://sentry.io/
   - Click en tu proyecto "upick"
   - Deberías ver el error "Test Sentry Error" en la lista de errores
   - Click en el error para ver los detalles

4. **Elimina la página de prueba después de verificar:**

```bash
# Elimina el archivo de prueba
rm src/app/test-sentry/page.tsx
```

---

## 📋 PASO 6: CONFIGURAR ALERTAS (Opcional pero Recomendado)

1. **Ve a tu proyecto en Sentry**
2. **Click en "Alerts"** en el menú lateral
3. **Click en "Create Alert Rule"**
4. **Configura:**
   - **Name:** "Errores Críticos en Producción"
   - **Conditions:**
     - When an issue is seen more than 10 times in 1m
     - And the issue's level is error or fatal
   - **Actions:**
     - Enviar email a tu dirección
     - O crear un webhook (si tienes Slack/Discord)

---

## 📋 PASO 7: CONFIGURAR RELEASES (Opcional)

Las releases te permiten rastrear qué versión del código causó cada error:

1. **En Vercel, agrega estas variables de entorno:**

```env
SENTRY_AUTH_TOKEN=tu_auth_token_de_sentry
SENTRY_ORG=tu_organizacion
SENTRY_PROJECT=upick
```

2. **Para obtener el Auth Token:**
   - Ve a Sentry: https://sentry.io/settings/account/api/auth-tokens/
   - Click en "Create New Token"
   - Selecciona permisos: `project:releases`
   - Copia el token generado

---

## ✅ VERIFICACIÓN FINAL

### Checklist:

- [ ] Cuenta de Sentry creada
- [ ] Proyecto "Next.js" creado en Sentry
- [ ] DSN copiado y guardado
- [ ] DSN agregado a `.env.local`
- [ ] DSN agregado a Vercel (si aplica)
- [ ] Wizard de Sentry ejecutado (opcional pero recomendado)
- [ ] Error de prueba enviado a Sentry
- [ ] Error visible en dashboard de Sentry
- [ ] Archivos de configuración verificados

---

## 🎯 PRÓXIMOS PASOS

Una vez configurado Sentry:

1. **Monitoreo Automático:**
   - Todos los errores se enviarán automáticamente a Sentry
   - Verás errores en tiempo real en el dashboard

2. **Session Replay:**
   - Sentry grabará sesiones cuando ocurran errores
   - Podrás ver exactamente qué hizo el usuario antes del error

3. **Performance Monitoring:**
   - Sentry rastreará automáticamente el rendimiento
   - Verás métricas de tiempo de respuesta de APIs

4. **Integraciones:**
   - Conecta Sentry con Slack, Discord, o email
   - Recibe notificaciones instantáneas de errores

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### Problema: "DSN not found"

**Solución:**

- Verifica que `NEXT_PUBLIC_SENTRY_DSN` esté en `.env.local`
- Reinicia el servidor de desarrollo
- Verifica que el DSN sea correcto (debe empezar con `https://`)

### Problema: "No errors showing in Sentry"

**Solución:**

- Verifica que `NEXT_PUBLIC_SENTRY_ENABLE_DEV=true` si estás en desarrollo
- Verifica que el DSN sea correcto
- Revisa la consola del navegador para errores de Sentry
- Asegúrate de que los archivos de configuración estén en la raíz del proyecto

### Problema: "Wizard fails"

**Solución:**

- Asegúrate de tener Node.js 18+ instalado
- Ejecuta `pnpm install` antes del wizard
- Si falla, puedes configurar manualmente (los archivos ya están creados)

---

## 📚 RECURSOS ADICIONALES

- **Documentación oficial:** https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Dashboard de Sentry:** https://sentry.io/
- **Soporte:** https://sentry.io/support/

---

**¡Listo!** Una vez completados estos pasos, Sentry estará completamente configurado y monitoreando tu aplicación. 🎉
