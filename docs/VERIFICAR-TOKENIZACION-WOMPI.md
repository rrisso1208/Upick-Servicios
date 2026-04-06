# 🔍 Cómo Verificar la Tokenización en Wompi

## 📋 Resumen

La tokenización en Wompi **NO se habilita directamente en el dashboard**. Funciona automáticamente cuando:
1. ✅ Tienes un `acceptanceToken` válido
2. ✅ Pasas `collectPaymentSource: true` al widget
3. ✅ El usuario marca la casilla de consentimiento

Sin embargo, hay varias cosas que puedes verificar:

---

## 🔑 Paso 1: Verificar el Acceptance Token

El `acceptanceToken` es **CRÍTICO** para la tokenización. Se obtiene automáticamente del endpoint de Wompi.

### Verificar en tu aplicación:

1. **Abre la consola del navegador** cuando estés en la página de checkout
2. **Busca estos logs:**
   ```
   ✅ Tokenization: "Ready - payment method will be saved"
   acceptanceTokenPrefix: "eyJhbGciOiJIUzI1NiJ9..."
   ```

3. **Si ves `❌ MISSING` o `undefined`:**
   - El `acceptanceToken` no se está obteniendo correctamente
   - Revisa los logs del servidor para ver si hay errores al llamar a `/api/payments/wompi-merchants`

### Verificar manualmente:

Puedes probar directamente el endpoint de Wompi:

```bash
# Reemplaza PUB_TEST_KEY con tu llave pública
curl https://sandbox.wompi.co/v1/merchants/pub_test_hTtjwSkjkwrnXtGQ48Y3iwkMBJDMMjBb
```

**Respuesta esperada:**
```json
{
  "data": {
    "presigned_acceptance": {
      "acceptance_token": "eyJhbGciOiJIUzI1NiJ9...",
      "permalink": "https://wompi.com/assets/downloadble/reglamento-Usuarios-Colombia.pdf",
      "type": "END_USER_POLICY"
    }
  }
}
```

**✅ Si obtienes el `acceptance_token` (como en tu caso):**
- El endpoint funciona correctamente
- El token está disponible y es válido
- El problema NO está en la obtención del token

**⚠️ Nota sobre expiración:**
- El `acceptance_token` es un JWT que tiene un campo `exp` (expiración)
- Los tokens de Wompi generalmente expiran después de varias horas
- Tu aplicación obtiene un token fresco cada vez que se carga el checkout, así que esto no debería ser un problema

**Si NO obtienes `acceptance_token`:**
- Tu cuenta de Wompi podría no estar completamente configurada
- Contacta a soporte de Wompi para verificar el estado de tu cuenta

---

## 🔧 Paso 2: Verificar Configuración del Dashboard

### En el Dashboard de Wompi:

1. **Ve a:** `comercios.wompi.co/developers`
2. **Verifica:**
   - ✅ **URL de Eventos (Webhook):** Debe estar configurada: `https://upick-xi.vercel.app/api/payments/webhook`
   - ✅ **Llave pública:** Debe coincidir con `NEXT_PUBLIC_WOMPI_PUBLIC_KEY` en tu `.env`
   - ✅ **Modo de pruebas:** Debe estar activado si estás en sandbox

### Configuraciones importantes:

**No hay una opción específica de "Habilitar Tokenización"** en el dashboard porque:
- La tokenización es una característica automática de Wompi
- Se activa cuando pasas el `acceptanceToken` correcto al widget
- El `acceptanceToken` se genera automáticamente para cada merchant

---

## 🧪 Paso 3: Verificar en una Transacción Real

### Durante el pago:

1. **Abre la consola del navegador** antes de hacer el pago
2. **Marca la casilla** "Guardar método de pago"
3. **Completa el pago** en el widget de Wompi
4. **Revisa los logs del webhook** después del pago

### Logs esperados en el webhook:

```json
{
  "payment_source_id": "12345678",  // ✅ Debe tener un valor
  "status": "APPROVED",
  "payment_method": {
    "type": "CARD",
    "token": "tok_test_..."
  }
}
```

### Si `payment_source_id` es `null`:

**Posibles causas:**

1. **El `acceptanceToken` no se pasó correctamente al widget**
   - Verifica los logs de inicialización del widget
   - Debe mostrar: `hasAcceptanceToken: true`

2. **El usuario no marcó la casilla de consentimiento**
   - Verifica que `consentToSavePaymentMethod: true` en los logs

3. **Problema con la configuración del merchant en Wompi**
   - Contacta a soporte de Wompi: `soporte@wompi.co`
   - Pregunta específicamente sobre la tokenización de métodos de pago

4. **El widget no está usando el `acceptanceToken` correctamente**
   - Verifica que el widget reciba el token antes de inicializarse
   - Revisa los logs: `Rendering WompiWidget with props`

---

## 🔍 Paso 4: Verificar en los Logs del Servidor

### Logs importantes a revisar:

1. **Al obtener el acceptance token:**
   ```
   [info] Successfully fetched Wompi acceptance token
   acceptanceTokenPrefix: "eyJhbGciOiJIUzI1NiJ9..."
   ```

2. **Al inicializar el widget:**
   ```
   ✅ WompiWidget initialized successfully
   willTokenize: true
   ✅ Tokenization: "Ready - payment method will be saved"
   ```

3. **En el webhook después del pago:**
   ```
   payment_source_id: "12345678"  // ✅ Debe tener valor
   ```

---

## 📞 Paso 5: Contactar Soporte de Wompi

Si después de verificar todo lo anterior, `payment_source_id` sigue siendo `null`:

### Información a proporcionar:

1. **Tu Public Key:** `pub_test_hTtjwSkjkwrnXtGQ48Y3iwkMBJDMMjBb`
2. **ID de transacción de ejemplo:** (de los logs del webhook)
3. **Estado actual:**
   - ✅ `acceptanceToken` se obtiene correctamente (verificado con endpoint manual)
   - ✅ El endpoint `/merchants/{publicKey}` devuelve `presigned_acceptance.acceptance_token`
   - ✅ `collectPaymentSource: true` se pasa al widget
   - ✅ Usuario marca la casilla de consentimiento
   - ✅ Los logs muestran `willTokenize: true` y `✅ Tokenization: "Ready"`
   - ❌ `payment_source_id` es `null` en la respuesta del webhook

### Pregunta específica:

> "Hola, estoy intentando tokenizar métodos de pago usando el widget de Wompi en modo sandbox. 
> 
> **Configuración actual:**
> - Public Key: `pub_test_hTtjwSkjkwrnXtGQ48Y3iwkMBJDMMjBb`
> - El endpoint `/merchants/{publicKey}` devuelve correctamente el `acceptance_token`
> - Paso `acceptance_token` y `collectPaymentSource: true` al widget
> - El usuario marca la casilla de consentimiento
> - Los logs confirman que la tokenización está lista
> 
> **Problema:**
> - En todas las transacciones aprobadas, el campo `payment_source_id` en el webhook es `null`
> - Esto impide guardar los métodos de pago para uso futuro
> 
> **Pregunta:**
> ¿Hay alguna configuración adicional que deba hacer en el dashboard para habilitar la tokenización?
> ¿La tokenización funciona en modo sandbox o solo en producción?
> ¿Hay algún requisito específico que deba cumplir para que Wompi genere el `payment_source_id`?"

---

## ✅ Checklist de Verificación

- [ ] El `acceptanceToken` se obtiene correctamente (ver logs)
- [ ] El `acceptanceToken` se pasa al widget (ver logs de inicialización)
- [ ] `collectPaymentSource: true` se pasa al widget
- [ ] El usuario marca la casilla de consentimiento
- [ ] El webhook está configurado correctamente
- [ ] La llave pública en el dashboard coincide con la del `.env`
- [ ] Revisaste los logs del webhook y `payment_source_id` sigue siendo `null`
- [ ] Contactaste a soporte de Wompi si todo lo anterior está correcto

---

## 🔍 Investigación: ¿Es un problema del modo Sandbox?

### Resultados de la investigación:

Según la documentación oficial de Wompi:

1. **✅ La tokenización DEBERÍA funcionar en Sandbox:**
   - La documentación oficial indica que todas las funcionalidades, incluida la tokenización, están disponibles en modo sandbox
   - El entorno sandbox está diseñado para permitir pruebas completas antes de pasar a producción

2. **⚠️ Posibles limitaciones conocidas:**
   - Algunos usuarios reportan que `payment_source_id` puede ser `null` en sandbox en ciertos casos
   - Esto podría ser una limitación temporal o un bug conocido del entorno de pruebas
   - La documentación no menciona explícitamente esta limitación

3. **🔍 Casos reportados:**
   - Hay reportes en el soporte de Wompi sobre problemas con tokenización (Tokenbox/Oneclick)
   - Estos problemas pueden estar relacionados con la configuración del merchant o limitaciones del sandbox

### Recomendaciones:

1. **Primero, verifica en producción (si es posible):**
   - Si tienes acceso a un entorno de producción, prueba la tokenización allí
   - Esto confirmará si es una limitación del sandbox o un problema real

2. **Contacta a soporte de Wompi:**
   - Pregunta específicamente: "¿La tokenización genera `payment_source_id` en modo sandbox?"
   - Menciona que tienes todo configurado correctamente pero `payment_source_id` es `null`

3. **Workaround temporal:**
   - Si la tokenización no funciona en sandbox, puedes guardar los métodos de pago usando:
     - `last4Digits` para tarjetas
     - `bankName` para PSE/Nequi/Daviplata
   - Esto permite guardar métodos de pago aunque no tengas el `payment_source_id`

---

## 🎯 Conclusión

**La tokenización NO se "habilita" en el dashboard** - es una característica automática que funciona cuando:
- Tienes un `acceptanceToken` válido
- Pasas `collectPaymentSource: true` al widget
- El usuario da su consentimiento

**Sobre el modo Sandbox:**
- Según la documentación, la tokenización DEBERÍA funcionar en sandbox
- Sin embargo, hay reportes de usuarios donde `payment_source_id` es `null` en sandbox
- Esto podría ser una limitación conocida del entorno de pruebas

**Si todo está correcto y `payment_source_id` sigue siendo `null`:**
1. ✅ **Workaround actual:** El código ya guarda métodos de pago usando `last4Digits` y `bankName` cuando `payment_source_id` es `null`
2. ⏳ **Próximo paso:** Verificar en producción cuando cambies de sandbox a modo real
3. 📞 **Si persiste en producción:** Contacta a soporte de Wompi preguntando específicamente sobre tokenización

**📝 Nota:** La funcionalidad de guardar métodos de pago funciona incluso sin `payment_source_id`, aunque no podrás reutilizarlos directamente con Wompi sin el token completo. Esto es suficiente para la mayoría de casos de uso.

