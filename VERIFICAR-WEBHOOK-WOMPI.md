# 🔍 Guía para Verificar el Webhook de Wompi

## ✅ Verificación Rápida

### 1. **Verificar que el endpoint está activo:**

Abre en tu navegador:

```
https://upick-xi.vercel.app/api/payments/webhook
```

**Deberías ver:**

```json
{
  "success": true,
  "message": "Webhook endpoint is active",
  "timestamp": "2025-11-21T12:50:00.000Z"
}
```

Si ves esto, el endpoint está funcionando ✅

---

## 🔧 Verificaciones en Wompi Dashboard

### 1. **URL de Eventos configurada:**

En el dashboard de Wompi:

- Ve a: **Desarrollo → Programadores**
- Busca: **"URL de Eventos"** o **"Seguimiento de transacciones"**
- Verifica que la URL sea exactamente:
  ```
  https://upick-xi.vercel.app/api/payments/webhook
  ```

**⚠️ IMPORTANTE:**

- ✅ Debe empezar con `https://`
- ✅ No debe terminar con `/`
- ✅ Debe ser la URL completa del endpoint
- ✅ Debe estar guardada (click en "Guardar")

---

### 2. **Verificar el Webhook Secret:**

En el dashboard de Wompi:

- Ve a: **Desarrollo → Programadores**
- Busca: **"Llaves del API"** o **"Webhook Secret"**
- Copia el **Webhook Secret** (si existe)

**En Vercel:**

- Ve a: **Settings → Environment Variables**
- Verifica que `WOMPI_WEBHOOK_SECRET` esté configurada
- Debe coincidir con el secret del dashboard de Wompi

**⚠️ NOTA:** En sandbox, Wompi puede no requerir un secret específico, pero si lo tienes configurado, debe coincidir.

---

## 🧪 Probar el Webhook Manualmente

### Opción 1: Usar curl

```bash
curl -X POST https://upick-xi.vercel.app/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "transaction.updated",
    "data": {
      "transaction": {
        "id": "test-123",
        "status": "APPROVED",
        "reference": "test-order-id",
        "amount_in_cents": 10000,
        "currency": "COP",
        "payment_method_type": "CARD",
        "created_at": "2025-11-21T12:00:00Z"
      }
    },
    "environment": "test",
    "signature": {
      "checksum": "TEST",
      "properties": ["transaction.id", "transaction.status"]
    },
    "timestamp": 1734780000,
    "sent_at": "2025-11-21T12:00:00Z"
  }'
```

**Respuesta esperada:**

- Status: `200 OK`
- Body: `{"error": "Invalid signature"}` (esperado en sandbox sin secret correcto)

---

## 📊 Verificar Logs

### En Vercel:

1. Ve a: **Deployments → [Último deploy] → Functions**
2. Busca: `/api/payments/webhook`
3. Revisa los logs para ver:
   - `Webhook request received` - Confirma que llegó la petición
   - `Webhook payload parsed successfully` - Confirma que el JSON es válido
   - `Invalid webhook signature` - Indica problema con el secret
   - `Webhook received` - Confirma que se procesó

### Logs esperados cuando funciona:

```
[INFO] Webhook request received
[INFO] Webhook payload parsed successfully
[INFO] Webhook signature verified
[INFO] Payment approved
[INFO] Order updated to paid
```

---

## 🐛 Problemas Comunes

### Problema 1: "Invalid webhook signature"

**Causa:** El `WOMPI_WEBHOOK_SECRET` no coincide con el configurado en Wompi.

**Solución:**

1. Ve al dashboard de Wompi
2. Copia el Webhook Secret exacto
3. Actualiza `WOMPI_WEBHOOK_SECRET` en Vercel
4. Redeploy

**Nota:** En sandbox, el webhook puede funcionar incluso con signature inválida (se procesa pero se loguea como warning).

---

### Problema 2: "Webhook not received"

**Causas posibles:**

1. URL mal configurada en Wompi
2. Endpoint no accesible públicamente
3. Firewall bloqueando peticiones de Wompi

**Soluciones:**

1. Verifica la URL en Wompi dashboard (debe ser exacta)
2. Prueba el endpoint GET: `https://upick-xi.vercel.app/api/payments/webhook`
3. Verifica que Vercel no tenga restricciones de IP

---

### Problema 3: "Webhook received but order not updated"

**Causas posibles:**

1. Error en el procesamiento del webhook
2. Orden no encontrada
3. Error en la base de datos

**Solución:**

1. Revisa los logs de Vercel para ver el error específico
2. Verifica que la orden existe con el `reference` correcto
3. Verifica que la base de datos esté accesible

---

## ✅ Checklist de Verificación

- [ ] Endpoint GET responde correctamente
- [ ] URL configurada en Wompi es exacta: `https://upick-xi.vercel.app/api/payments/webhook`
- [ ] `WOMPI_WEBHOOK_SECRET` está configurado en Vercel
- [ ] `WOMPI_WEBHOOK_SECRET` coincide con el de Wompi (si aplica)
- [ ] Logs muestran "Webhook received" cuando llega una transacción
- [ ] Logs muestran "Payment approved" cuando el pago es exitoso
- [ ] La orden se actualiza a `paid` después del webhook

---

## 🔄 Probar con una Transacción Real

1. **Haz un pedido de prueba:**
   - Usa una tarjeta de prueba de Wompi sandbox
   - Completa el pago

2. **Verifica los logs:**
   - En Vercel, busca los logs del webhook
   - Deberías ver el flujo completo

3. **Verifica la orden:**
   - Ve a "Mis pedidos"
   - La orden debería aparecer como "Pagado"

---

## 📞 Si el Webhook No Funciona

### Paso 1: Verificar URL

```
https://upick-xi.vercel.app/api/payments/webhook
```

Debe responder con JSON cuando haces GET.

### Paso 2: Verificar Secret

El `WOMPI_WEBHOOK_SECRET` en Vercel debe coincidir con el de Wompi.

### Paso 3: Revisar Logs

Los logs de Vercel te dirán exactamente qué está fallando.

### Paso 4: Usar Fallback

El sistema ahora tiene un fallback que verifica directamente con Wompi API si el webhook no llega, así que los pagos se procesarán de todas formas.

---

## 🎯 Conclusión

El webhook puede fallar por varias razones, pero ahora:

1. ✅ Tienes mejor logging para diagnosticar
2. ✅ Tienes un endpoint GET para verificar que está activo
3. ✅ Tienes un fallback que verifica directamente con Wompi API
4. ✅ El sistema procesa pagos incluso si el webhook falla

**Recomendación:** Verifica la URL en Wompi dashboard y asegúrate de que sea exactamente `https://upick-xi.vercel.app/api/payments/webhook` (sin trailing slash).
