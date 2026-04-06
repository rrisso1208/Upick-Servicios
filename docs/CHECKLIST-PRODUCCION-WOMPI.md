# ✅ Checklist para Cambiar a Producción - Wompi

## 📋 Resumen

Este checklist te guiará cuando estés listo para cambiar de **Sandbox** a **Producción** en Wompi.

---

## 🔄 Paso 1: Activar Modo Producción en Wompi

1. **Ve al Dashboard de Wompi:**
   ```
   https://comercios.wompi.co
   ```

2. **Navega a Configuración:**
   ```
   Dashboard → Configuración → Modo de Operación
   ```

3. **Cambia a Producción:**
   - Selecciona **"Producción"** o **"Modo Real"**
   - Confirma el cambio

4. **Completa la Verificación (si es necesario):**
   - Wompi puede pedirte:
     - Documento de identidad
     - Datos bancarios
     - Información del negocio
     - Verificación de cuenta

---

## 🔑 Paso 2: Obtener Keys de Producción

1. **Ve a Integraciones:**
   ```
   Dashboard → Integraciones → API Keys
   ```

2. **Copia las Keys de Producción:**
   - ✅ **Public Key (Producción):** `pub_prod_xxxxxxxxxx`
   - ✅ **Private Key (Producción):** `prv_prod_xxxxxxxxxx`
   - ✅ **Webhook Secret (Producción):** (si es diferente)

3. **⚠️ IMPORTANTE:**
   - Las keys de producción son DIFERENTES a las de sandbox
   - NO uses las keys de sandbox en producción
   - Guarda estas keys en un lugar seguro

---

## ⚙️ Paso 3: Actualizar Variables de Entorno

### En Vercel (Producción):

1. **Ve a tu proyecto en Vercel:**
   ```
   https://vercel.com/dashboard
   ```

2. **Navega a Settings:**
   ```
   Proyecto → Settings → Environment Variables
   ```

3. **Actualiza estas variables:**

   ```env
   # Cambiar de sandbox a producción
   NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_prod_TU_KEY_PRODUCCION
   WOMPI_PRIVATE_KEY=prv_prod_TU_KEY_PRODUCCION
   WOMPI_API_URL=https://production.wompi.co/v1
   WOMPI_WEBHOOK_SECRET=tu-secreto-produccion
   ```

4. **⚠️ IMPORTANTE:**
   - Actualiza TODAS las variables relacionadas con Wompi
   - Asegúrate de que `WOMPI_API_URL` apunte a `production.wompi.co`
   - Verifica que las keys empiecen con `pub_prod_` y `prv_prod_`

5. **Selecciona el Environment:**
   - Marca **Production** (y Preview si quieres)
   - Guarda los cambios

6. **Haz un nuevo deploy:**
   - Vercel detectará los cambios automáticamente
   - O puedes hacer un deploy manual

---

## 🔔 Paso 4: Actualizar Webhook

1. **Ve al Dashboard de Wompi:**
   ```
   Dashboard → Programadores → Configuraciones avanzadas
   ```

2. **Actualiza la URL del Webhook:**
   ```
   URL de Eventos: https://tu-dominio-real.com/api/payments/webhook
   ```

3. **⚠️ IMPORTANTE:**
   - La URL debe ser HTTPS (no HTTP)
   - Debe ser accesible públicamente
   - Debe apuntar a tu dominio de producción

4. **Guarda los cambios**

---

## 🧪 Paso 5: Verificar Tokenización en Producción

Una vez en producción, verifica si la tokenización funciona:

1. **Realiza un pedido de prueba:**
   - Usa una tarjeta REAL (con dinero real)
   - Marca la casilla "Guardar método de pago"
   - Completa el pago

2. **Revisa los logs del webhook:**
   - Busca en los logs de Vercel: `/api/payments/webhook`
   - Verifica si `payment_source_id` tiene un valor (no `null`)

3. **Verifica en la base de datos:**
   - Revisa la tabla `SavedPaymentMethod`
   - Verifica que el método se guardó correctamente
   - Si `wompiPaymentSourceId` tiene un valor, la tokenización funcionó ✅

4. **Prueba reutilizar el método:**
   - Intenta hacer otro pedido
   - Selecciona el método de pago guardado
   - Verifica que el pago se procese correctamente

---

## ✅ Checklist Final

Antes de considerar que la migración a producción está completa:

- [ ] Modo producción activado en Wompi
- [ ] Keys de producción obtenidas y guardadas
- [ ] Variables de entorno actualizadas en Vercel
- [ ] `WOMPI_API_URL` apunta a `production.wompi.co`
- [ ] Webhook actualizado con URL de producción
- [ ] Nuevo deploy realizado en Vercel
- [ ] Pedido de prueba realizado con tarjeta real
- [ ] Webhook recibido correctamente
- [ ] Tokenización verificada (si `payment_source_id` no es `null`)
- [ ] Método de pago guardado correctamente
- [ ] Reutilización de método de pago probada

---

## 🚨 Si la Tokenización NO Funciona en Producción

Si después de cambiar a producción, `payment_source_id` sigue siendo `null`:

1. **Verifica la configuración:**
   - Revisa que todas las variables estén correctas
   - Verifica que el `acceptanceToken` se obtenga correctamente
   - Revisa los logs para ver si hay errores

2. **Contacta a soporte de Wompi:**
   - Email: `soporte@wompi.co`
   - Menciona que estás en producción
   - Proporciona:
     - Tu Public Key de producción
     - ID de una transacción de ejemplo
     - Logs relevantes

3. **Workaround temporal:**
   - El código ya guarda métodos de pago usando `last4Digits` y `bankName`
   - Esto permite guardar métodos aunque no tengas `payment_source_id`
   - Los usuarios podrán ver sus métodos guardados, aunque no se puedan reutilizar directamente

---

## 📝 Notas Importantes

1. **Dinero Real:**
   - En producción, se procesarán pagos REALES
   - Se cobrará dinero REAL a las tarjetas
   - Asegúrate de estar listo antes de activar

2. **Testing:**
   - Haz pruebas con montos pequeños primero
   - Verifica que todo funcione antes de lanzar completamente

3. **Monitoreo:**
   - Revisa los logs regularmente
   - Monitorea las transacciones en el dashboard de Wompi
   - Verifica que los webhooks se reciban correctamente

4. **Rollback:**
   - Si algo sale mal, puedes volver a sandbox
   - Solo cambia las variables de entorno de vuelta
   - Haz un nuevo deploy

---

## 🎯 Conclusión

Una vez que cambies a producción, podrás verificar definitivamente si la tokenización funciona correctamente. Si `payment_source_id` tiene un valor en producción, significa que la limitación era del sandbox. Si sigue siendo `null`, entonces hay un problema de configuración que deberás resolver con soporte de Wompi.

**¡Buena suerte con el lanzamiento!** 🚀

