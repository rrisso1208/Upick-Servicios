# 🔒 Corrección Crítica: Prevención de Cancelación de Pedidos No Pagados

## ❌ Problema Identificado

Se descubrió un problema crítico de seguridad y lógica de negocio:

- Los pedidos con estado `awaiting_payment` (pago no completado) aparecían en el panel del restaurante
- Estos pedidos podían ser cancelados, generando créditos sin que el pago hubiera pasado
- Los pedidos no pagados mostraban QR cuando no deberían

## ✅ Soluciones Implementadas

### 1. Nuevo Estado: `payment_failed`

- Agregado al enum `OrderStatus` en `prisma/schema.prisma`
- Migración SQL creada: `prisma/migrations/add_payment_failed_status.sql`

### 2. Filtrado en Panel del Restaurante

**Archivo:** `src/app/api/admin/orders/route.ts`

- Los pedidos con estado `awaiting_payment` y `payment_failed` **NO aparecen** en el panel del restaurante
- Solo se muestran pedidos que han sido pagados o están en proceso

### 3. Prevención de Cancelación de Pedidos No Pagados

**Archivo:** `src/app/api/orders/[id]/cancel/route.ts`

- Validación crítica: No se permite cancelar pedidos con estado `awaiting_payment` o `payment_failed`
- Verificación adicional: El pedido debe tener un registro de `payment` para poder cancelarse
- Mensaje de error claro: "No se puede cancelar este pedido porque el pago no se completó"

### 4. Actualización del Webhook

**Archivo:** `src/app/api/payments/webhook/route.ts`

- Cuando un pago falla (DECLINED, VOIDED, ERROR), el pedido se marca como `payment_failed`
- Se libera la reserva del slot
- **NO se genera reembolso** porque nunca hubo pago

### 5. UI - Prevención de Cancelación

**Archivos:**

- `src/components/ui/CancelOrderModal.tsx`: Valida que el pedido pueda cancelarse antes de mostrar el modal
- `src/app/orders/page.tsx`: No muestra botón de cancelar para pedidos no pagados
- `src/components/ui/OrderCard.tsx`: No muestra QR para pedidos no pagados

### 6. Estado en UI

- Agregado `payment_failed` a `statusConfig` en `OrderCard.tsx`
- Agregado filtro "Pago fallido" en la página de pedidos del usuario

## 📋 Migraciones SQL Requeridas

### 1. Crear enum `NotificationType` (si no existe)

```sql
-- Ejecutar: prisma/migrations/add_notification_type_enum.sql
```

### 2. Agregar estado `payment_failed` a `OrderStatus`

```sql
-- Ejecutar: prisma/migrations/add_payment_failed_status.sql
```

## 🔍 Verificación

Después de ejecutar las migraciones, verificar:

1. **Panel del restaurante:** No debe mostrar pedidos `awaiting_payment` o `payment_failed`
2. **Cancelación:** No debe permitir cancelar pedidos no pagados
3. **QR:** Pedidos no pagados no deben mostrar QR
4. **Webhook:** Pedidos con pago fallido deben marcarse como `payment_failed`

## ⚠️ Importante

- Los pedidos `awaiting_payment` que nunca se pagaron deben quedar en ese estado o cambiar a `payment_failed` cuando expire el tiempo de pago
- Considerar agregar un job que marque pedidos `awaiting_payment` antiguos como `payment_failed` automáticamente
