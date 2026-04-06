# 🔧 Corrección Completa del Flujo de Pagos Wompi

**Fecha:** Noviembre 2025  
**Commit base:** `ad6896d` - "Mejorar manejo de callback del widget Wompi"

---

## 📋 RESUMEN DEL PROBLEMA

El widget de Wompi se quedaba cargando indefinidamente después del pago y no ejecutaba las acciones posteriores (crear QR, registrar orden, etc.).

---

## ✅ CORRECCIONES APLICADAS

### 1. **Callback del Widget Wompi** (`src/components/payments/WompiWidget.tsx`)

**Problema:** El callback no manejaba correctamente todos los estados y no redirigía consistentemente.

**Solución:**

- ✅ Siempre redirige a `payment-result` después del callback, independientemente del estado
- ✅ Pasa `transaction_id` y `status` como query params en la URL
- ✅ Maneja correctamente estados `APPROVED`, `DECLINED`, `ERROR`, `VOIDED`
- ✅ Logging mejorado para debugging

**Cambios clave:**

```typescript
// Siempre redirige con información de la transacción
const url = new URL(redirectUrl, window.location.origin);
url.searchParams.set('transaction_id', transaction.id);
url.searchParams.set('status', transaction.status);
window.location.href = url.toString();
```

---

### 2. **Webhook de Wompi** (`src/app/api/payments/webhook/route.ts`)

**Problemas encontrados:**

- ❌ Usaba `order.universityId` que no existe (debería ser `order.placeId`)
- ❌ No siempre respondía 200 a Wompi, causando reintentos
- ❌ No manejaba correctamente estados `VOIDED` y `ERROR`

**Soluciones:**

- ✅ Cambiado `university` a `place` en todos los includes
- ✅ Cambiado `order.universityId` a `order.placeId` en `resolveCommissionPolicy`
- ✅ Siempre responde 200 a Wompi, incluso en errores (previene reintentos)
- ✅ Maneja correctamente `DECLINED`, `VOIDED`, `ERROR`:
  - Libera reserva de slot
  - Actualiza estado del pago a `declined`
  - Cancela la orden
  - Registra razón del rechazo

**Cambios clave:**

```typescript
// Siempre responde 200, incluso en errores
return NextResponse.json(
  { success: false, error: 'Webhook processing failed' },
  { status: 200 } // IMPORTANTE: Siempre 200
);

// Manejo de estados rechazados
if (transaction.status === 'DECLINED' || transaction.status === 'VOIDED' || transaction.status === 'ERROR') {
  await releaseSlotReservation(...);
  await prisma.payment.update({ status: 'declined', declinedReason: ... });
  await prisma.order.update({ status: 'cancelled' });
}
```

---

### 3. **Página de Resultado de Pago** (`src/app/orders/[id]/payment-result/`)

**Problemas:**

- ❌ No leía correctamente los query params de Wompi
- ❌ No manejaba estados rechazados inmediatamente
- ❌ Polling muy corto (60s, 15 intentos)

**Soluciones:**

- ✅ Lee `transaction_id` y `status` de query params
- ✅ Maneja estados rechazados inmediatamente sin esperar webhook
- ✅ Polling aumentado a 90s y 20 intentos
- ✅ Espera 5 segundos antes del primer poll si el pago fue aprobado (para dar tiempo al webhook)

**Cambios clave:**

```typescript
// Manejo inmediato de estados rechazados
if (
  wompiStatus === 'DECLINED' ||
  wompiStatus === 'ERROR' ||
  wompiStatus === 'VOIDED'
) {
  setPaymentStatus('declined');
  setIsChecking(false);
  setErrorMessage('El pago fue rechazado. Por favor intenta nuevamente.');
  return;
}

// Espera para webhook si fue aprobado
if (transactionId && attempt === 0 && wompiStatus === 'APPROVED') {
  await new Promise((resolve) => setTimeout(resolve, 5000));
}
```

---

## 🔄 FLUJO COMPLETO CORREGIDO

### **Flujo de Pago Aprobado:**

1. **Usuario hace pedido** → Se crea orden con `status: 'awaiting_payment'` y `pickupCode` generado
2. **Usuario hace clic en "Pagar"** → Se abre widget de Wompi
3. **Usuario completa pago** → Widget llama callback con `status: 'APPROVED'`
4. **Callback redirige** → A `/orders/{orderId}/payment-result?transaction_id=XXX&status=APPROVED`
5. **PaymentResultClient** → Espera 5 segundos, luego hace polling cada 3s
6. **Webhook llega** → Procesa pago:
   - Confirma reserva de slot
   - Calcula comisiones
   - Actualiza orden a `status: 'paid'`
   - Envía notificaciones
   - Responde 200 a Wompi
7. **Polling detecta** → `order.status === 'paid'`
8. **Redirige a receipt** → Muestra QR y recibo completo

### **Flujo de Pago Rechazado:**

1. **Usuario completa pago** → Widget llama callback con `status: 'DECLINED'`
2. **Callback redirige** → A `/orders/{orderId}/payment-result?transaction_id=XXX&status=DECLINED`
3. **PaymentResultClient** → Detecta estado rechazado inmediatamente
4. **Muestra error** → "El pago fue rechazado. Por favor intenta nuevamente."
5. **Webhook llega** → Procesa rechazo:
   - Libera reserva de slot
   - Actualiza pago a `status: 'declined'`
   - Cancela orden (`status: 'cancelled'`)
   - Responde 200 a Wompi

---

## 🎯 PUNTOS CRÍTICOS CORREGIDOS

### ✅ **Callback siempre redirige**

- No importa el estado, siempre redirige a `payment-result`
- Pasa información de transacción en query params

### ✅ **Webhook siempre responde 200**

- Previene reintentos infinitos de Wompi
- Errores se manejan internamente con logging

### ✅ **Estados rechazados se manejan inmediatamente**

- No espera webhook para mostrar error
- Usuario ve feedback inmediato

### ✅ **Polling robusto**

- Espera tiempo suficiente para webhook
- Máximo 90 segundos y 20 intentos
- Maneja timeouts gracefully

### ✅ **Corrección de tipos**

- `university` → `place` en webhook
- `order.universityId` → `order.placeId`

---

## 📝 ARCHIVOS MODIFICADOS

1. `src/components/payments/WompiWidget.tsx`
   - Callback mejorado con redirección consistente
   - Manejo de todos los estados

2. `src/app/api/payments/webhook/route.ts`
   - Cambio de `university` a `place`
   - Siempre responde 200
   - Manejo completo de estados rechazados

3. `src/app/orders/[id]/payment-result/page.tsx`
   - Lectura correcta de query params
   - Soporte para múltiples formatos de params

4. `src/app/orders/[id]/payment-result/PaymentResultClient.tsx`
   - Manejo inmediato de estados rechazados
   - Polling mejorado (90s, 20 intentos)
   - Espera inicial para webhook

---

## 🚀 RECOMENDACIONES PARA PRODUCCIÓN

### 1. **Configurar Webhook en Wompi Dashboard**

```
URL: https://tu-dominio.com/api/payments/webhook
Eventos: transaction.updated
```

### 2. **Monitorear Logs**

- Revisar logs de webhook para detectar errores
- Monitorear tiempo de respuesta del webhook
- Alertar si webhook tarda > 5 segundos

### 3. **Testing**

- ✅ Probar pago aprobado completo
- ✅ Probar pago rechazado
- ✅ Probar timeout de webhook (simular delay)
- ✅ Probar múltiples pagos simultáneos

### 4. **Métricas a Monitorear**

- Tiempo promedio de procesamiento de webhook
- Tasa de éxito de pagos
- Tiempo promedio de polling hasta confirmación
- Errores de webhook

### 5. **Fallbacks**

- Si webhook falla, el usuario puede verificar manualmente en "Mis pedidos"
- El polling tiene timeout de 90s con mensaje claro
- Los pagos aprobados eventualmente se procesarán cuando llegue el webhook

---

## ✅ CHECKLIST DE VERIFICACIÓN

- [x] Callback del widget redirige correctamente
- [x] Webhook procesa pagos aprobados
- [x] Webhook maneja pagos rechazados
- [x] Webhook siempre responde 200
- [x] PaymentResultClient hace polling correctamente
- [x] Estados rechazados se muestran inmediatamente
- [x] QR se genera cuando orden se crea (ya existía)
- [x] Orden aparece en panel de admin cuando se paga
- [x] Orden aparece en "Mis pedidos" cuando se paga
- [x] Corrección de tipos (university → place)

---

## 🐛 DEBUGGING

Si el flujo aún no funciona:

1. **Revisar logs del navegador:**
   - Buscar `[WompiWidget]` para ver callback
   - Buscar `[PaymentResult]` para ver polling

2. **Revisar logs del servidor:**
   - Buscar `Webhook received` para ver si llega
   - Buscar `Payment approved` para ver procesamiento
   - Buscar errores en webhook

3. **Verificar configuración:**
   - `NEXT_PUBLIC_WOMPI_PUBLIC_KEY` está configurada
   - `WOMPI_WEBHOOK_SECRET` está configurada
   - Webhook está configurado en Wompi dashboard

4. **Verificar base de datos:**
   - Orden se crea con `pickupCode`
   - Pago se crea cuando llega webhook
   - Orden se actualiza a `paid` cuando webhook procesa

---

## 📞 SOPORTE

Si encuentras problemas:

1. Revisa los logs (navegador y servidor)
2. Verifica que el webhook esté configurado en Wompi
3. Prueba con una transacción de prueba en sandbox
4. Verifica que las variables de entorno estén correctas
