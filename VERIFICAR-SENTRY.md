# ✅ Verificación de Sentry - Upick

**Fecha:** Diciembre 2024

---

## ✅ CONFIGURACIÓN COMPLETADA

Tu DSN de Sentry ha sido agregado al archivo `.env.local`:

```
NEXT_PUBLIC_SENTRY_DSN=https://7be8f21756afedfa0067cfd57f4cd6c9@o4510375792148480.ingest.us.sentry.io/4510375794900992
NEXT_PUBLIC_SENTRY_ENABLE_DEV=true
```

---

## 🧪 PASOS PARA PROBAR

### 1. Reiniciar el servidor de desarrollo

**IMPORTANTE:** Debes reiniciar el servidor para que tome las nuevas variables de entorno.

```bash
# Si el servidor está corriendo, deténlo con Ctrl+C
# Luego inicia de nuevo:
pnpm dev
```

### 2. Visitar la página de prueba

Abre tu navegador y ve a:

```
http://localhost:3000/test-sentry
```

### 3. Generar un error de prueba

En la página verás:

- ✅ Un error automático que se envía al cargar la página
- 🔴 Un botón "Generar Error de Prueba Manual" - haz click en él

### 4. Verificar en Sentry

1. Ve a tu dashboard de Sentry:
   https://upick-5u.sentry.io/issues/

2. Deberías ver los errores aparecer en la lista:
   - "Test Sentry Error - Esto es solo una prueba automática"
   - "Error manual de prueba desde botón"

3. Click en cualquier error para ver los detalles completos

---

## ✅ CHECKLIST

- [x] DSN agregado a `.env.local`
- [x] `NEXT_PUBLIC_SENTRY_ENABLE_DEV=true` configurado
- [x] Archivos de configuración de Sentry verificados
- [x] Página de prueba creada (`src/app/test-sentry/page.tsx`)
- [ ] Servidor reiniciado
- [ ] Error de prueba enviado
- [ ] Error visible en dashboard de Sentry

---

## 🎯 PRÓXIMOS PASOS

Una vez verificado que funciona:

1. **Cambiar `NEXT_PUBLIC_SENTRY_ENABLE_DEV` a `false`** en producción
   - Esto evitará enviar errores de desarrollo a Sentry
   - Solo se enviarán errores de producción

2. **Agregar el DSN a Vercel** (si usas Vercel):
   - Ve a Settings > Environment Variables
   - Agrega `NEXT_PUBLIC_SENTRY_DSN` con tu DSN
   - Marca Production, Preview, Development

3. **Eliminar la página de prueba** (opcional):
   ```bash
   # Después de verificar que funciona
   rm src/app/test-sentry/page.tsx
   ```

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### "No veo errores en Sentry"

- ✅ Verifica que reiniciaste el servidor después de crear `.env.local`
- ✅ Verifica que `NEXT_PUBLIC_SENTRY_ENABLE_DEV=true` está en `.env.local`
- ✅ Revisa la consola del navegador (F12) para ver si hay errores de Sentry
- ✅ Asegúrate de que el DSN sea correcto (sin espacios)

### "Error en la consola del navegador"

- Verifica que el DSN empiece con `https://`
- Verifica que no haya espacios en el DSN
- Reinicia el servidor completamente

---

## 📊 ¿QUÉ MONITOREA SENTRY?

Una vez configurado, Sentry capturará automáticamente:

- ✅ Errores de JavaScript en el cliente
- ✅ Errores en API routes (servidor)
- ✅ Errores en Server Components
- ✅ Errores no capturados (unhandled errors)
- ✅ Performance de APIs y componentes
- ✅ Session replay cuando ocurren errores

---

**¡Listo!** Ahora solo necesitas reiniciar el servidor y probar. 🚀
