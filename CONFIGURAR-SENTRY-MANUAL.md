# 🔧 Configuración Manual de Sentry - Upick

**Fecha:** Diciembre 2024

---

## 📋 PASO 1: COPIAR EL DSN

1. **En la página de Sentry que tienes abierta:**
   - Haz click en el botón **"Copy DSN"** que aparece en la sección "Manual Configuration"
   - O ve a: Settings > Projects > javascript-nextjs > Client Keys (DSN)
   - Copia el DSN completo (se ve así: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)

2. **Guarda el DSN** - Lo necesitarás en el siguiente paso

---

## 📋 PASO 2: CREAR ARCHIVO .env.local

1. **Crea el archivo `.env.local` en la raíz del proyecto** (si no existe)

2. **Agrega estas líneas:**

```env
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=tu_dsn_aqui_pega_el_dsn_que_copiaste
NEXT_PUBLIC_SENTRY_ENABLE_DEV=false
```

3. **Reemplaza `tu_dsn_aqui_pega_el_dsn_que_copiaste`** con el DSN real que copiaste

**Ejemplo:**

```env
NEXT_PUBLIC_SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/123456
NEXT_PUBLIC_SENTRY_ENABLE_DEV=false
```

---

## 📋 PASO 3: VERIFICAR ARCHIVOS DE CONFIGURACIÓN

Verifica que estos archivos existan (ya están creados):

- ✅ `sentry.client.config.ts`
- ✅ `sentry.server.config.ts`
- ✅ `sentry.edge.config.ts`

Si no existen, ya los creamos anteriormente. Si necesitas recrearlos, están en la raíz del proyecto.

---

## 📋 PASO 4: ACTUALIZAR next.config.js (Opcional)

El wizard normalmente actualiza `next.config.js`, pero como lo hacemos manualmente, podemos agregar el plugin de Sentry:

**Abre `next.config.js` y agrégalo al inicio:**

```javascript
const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... tu configuración existente ...
};

// Exportar con Sentry (solo en producción)
module.exports =
  process.env.NODE_ENV === 'production'
    ? withSentryConfig(nextConfig, {
        silent: true,
        org: 'upick-5u',
        project: 'javascript-nextjs',
      })
    : nextConfig;
```

**Nota:** Esto es opcional. Los archivos de configuración que ya creamos funcionan sin esto.

---

## 📋 PASO 5: CREAR PÁGINA DE PRUEBA

Crea un archivo para probar que Sentry funciona:

**Crea:** `src/app/test-sentry/page.tsx`

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
      console.log('Error enviado a Sentry');
    }
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test de Sentry</h1>
      <p>Si ves este mensaje, la página se cargó correctamente.</p>
      <p className="mt-4 text-sm text-gray-600">
        Revisa tu dashboard de Sentry para ver el error de prueba.
      </p>
      <button
        onClick={() => {
          throw new Error('Error manual de prueba');
        }}
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
      >
        Generar Error de Prueba
      </button>
    </div>
  );
}
```

---

## 📋 PASO 6: PROBAR LA CONFIGURACIÓN

1. **Reinicia tu servidor de desarrollo:**

```bash
# Detén el servidor actual (Ctrl+C)
# Luego inicia de nuevo:
pnpm dev
```

2. **Visita la página de prueba:**
   - Ve a: http://localhost:3000/test-sentry
   - Haz click en el botón "Generar Error de Prueba"

3. **Verifica en Sentry:**
   - Ve a tu dashboard: https://upick-5u.sentry.io/
   - Click en "Issues" en el menú lateral
   - Deberías ver los errores de prueba aparecer en la lista
   - Click en un error para ver los detalles completos

4. **Si ves los errores en Sentry:** ✅ ¡Configuración exitosa!

---

## 📋 PASO 7: AGREGAR A VERCEL (Si usas Vercel)

1. **Ve a tu proyecto en Vercel:** https://vercel.com/dashboard
2. **Click en tu proyecto "upick"**
3. **Ve a Settings > Environment Variables**
4. **Agrega:**
   - **Name:** `NEXT_PUBLIC_SENTRY_DSN`
   - **Value:** Tu DSN de Sentry
   - **Environment:** Production, Preview, Development (marca todos)
5. **Click en "Save"**
6. **Redeploy tu aplicación** para que tome los cambios

---

## ✅ CHECKLIST DE VERIFICACIÓN

- [ ] DSN copiado de Sentry
- [ ] Archivo `.env.local` creado con el DSN
- [ ] Archivos de configuración de Sentry verificados
- [ ] Página de prueba creada (`src/app/test-sentry/page.tsx`)
- [ ] Servidor reiniciado
- [ ] Error de prueba enviado a Sentry
- [ ] Error visible en dashboard de Sentry
- [ ] Variables de entorno agregadas a Vercel (si aplica)

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### "No veo errores en Sentry"

- Verifica que el DSN sea correcto en `.env.local`
- Reinicia el servidor después de agregar el DSN
- Verifica la consola del navegador para errores
- Asegúrate de que `NEXT_PUBLIC_SENTRY_ENABLE_DEV=true` si quieres ver errores en desarrollo

### "Error: DSN not found"

- Verifica que el archivo `.env.local` exista
- Verifica que el DSN empiece con `https://`
- Reinicia el servidor

### "Los archivos de configuración no existen"

- Ya los creamos anteriormente, deberían estar en la raíz del proyecto
- Si no están, puedes copiarlos de los archivos que creamos:
  - `sentry.client.config.ts`
  - `sentry.server.config.ts`
  - `sentry.edge.config.ts`

---

## 🎯 PRÓXIMOS PASOS

Una vez configurado:

1. ✅ Sentry monitoreará automáticamente todos los errores
2. ✅ Verás errores en tiempo real en el dashboard
3. ✅ Puedes configurar alertas por email/Slack
4. ✅ Session replay estará disponible para errores

---

**¡Listo!** Con estos pasos, Sentry estará completamente configurado. 🎉
