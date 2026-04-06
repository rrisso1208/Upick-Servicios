# Sistema de Comisiones - Implementación Completa

## Resumen

Se ha implementado un sistema completo de comisiones entre la plataforma y los restaurantes, con dashboards para superadministrador y administradores de restaurante.

## Cambios en Base de Datos

### Schema Prisma (`prisma/schema.prisma`)

1. **Modelo `Restaurant`**:
   - Agregado campo `commissionPercentage` (Decimal, default 5.0%)
   - Representa el porcentaje de comisión que la plataforma cobra sobre cada venta

2. **Modelo `Order`**:
   - Agregado campo `platformCommissionAmount` (Int, nullable)
   - Agregado campo `netAmountForRestaurant` (Int, nullable)
   - Estos campos se calculan cuando el pedido se marca como `paid`

### Migración SQL (`prisma/migrations/add_restaurant_commission_fields.sql`)

- Agrega `commissionPercentage` a `Restaurant` con default 5.0%
- Agrega `platformCommissionAmount` y `netAmountForRestaurant` a `Order`
- Incluye comentarios de documentación
- Crea índice para optimizar consultas

**IMPORTANTE**: Ejecutar esta migración antes de usar el sistema:

```sql
-- Ejecutar en PostgreSQL
\i prisma/migrations/add_restaurant_commission_fields.sql
```

## Lógica de Negocio

### Nuevo Módulo: `src/lib/restaurant-commission.ts`

Funciones principales:

1. **`calculateRestaurantCommission(orderTotal, commissionPercentage)`**:
   - Calcula la comisión de la plataforma y el neto para el restaurante
   - Usa `Decimal.js` para precisión en cálculos monetarios
   - Redondea a centavos usando `ROUND_HALF_UP`

2. **`calculateAndSaveOrderCommission(orderId)`**:
   - Calcula y guarda la comisión cuando un pedido se marca como `paid`
   - Solo procesa pedidos con estado `paid`
   - Evita recalcular si ya existe comisión guardada

### Integración con Flujo de Pagos

**Archivos modificados**:

- `src/app/api/payments/webhook/route.ts`
- `src/app/api/payments/verify-transaction/route.ts`

**Cambios**:

- Después de calcular `OrderFinance` (sistema complejo existente), también se calcula la comisión simplificada
- Se ejecuta de forma no bloqueante (no falla el webhook si hay error)

## Endpoints API

### Superadmin

**`GET /api/superadmin/restaurants/[id]/commission-metrics`**

- Obtiene métricas de comisión para un restaurante específico
- Parámetros query: `dateFrom`, `dateTo` (opcionales, default últimos 30 días)
- Retorna:
  - Información del restaurante (nombre, porcentaje de comisión)
  - Rango de fechas
  - Métricas: ventas brutas, comisión total, neto para restaurante, número de pedidos

### Admin Restaurante

**`GET /api/admin/commission-metrics`**

- Obtiene métricas de comisión para el restaurante del admin autenticado
- Mismos parámetros y estructura que el endpoint de superadmin
- Validación de autenticación y pertenencia al restaurante

## Interfaces de Usuario

### Superadmin

#### 1. Formulario de Restaurante (`src/app/superadmin/restaurants/page.tsx`)

**Cambios**:

- Agregado campo "Porcentaje de Comisión de la Plataforma (%)"
- Campo numérico con step 0.1, min 0, max 100
- Default: 5.0%
- Validación en frontend y backend

**Ubicación**: En el modal de crear/editar restaurante, después del campo "Ubicación"

#### 2. Dashboard de Comisiones (`src/app/superadmin/restaurants/[id]/commission/page.tsx`)

**Características**:

- Vista dedicada para métricas de comisión de un restaurante
- Filtros de fecha: presets (hoy, últimos 7 días, últimos 30 días) y rango personalizado
- 4 tarjetas principales:
  - Ventas Brutas (verde)
  - Comisión de la Plataforma (azul)
  - Total a Transferir al Restaurante (morado)
  - Número de Pedidos (gris)
- Tabla resumen con desglose detallado
- Botón "Volver" para regresar a la lista de restaurantes

**Acceso**: Botón "Ver Comisiones" en cada tarjeta de restaurante

#### 3. Lista de Restaurantes

**Cambios**:

- Agregado botón "Ver Comisiones" en cada tarjeta de restaurante
- Muestra el porcentaje de comisión configurado (si está disponible)

### Admin Restaurante

#### Dashboard de Ingresos (`src/app/admin/commission/page.tsx`)

**Características**:

- Vista para que el restaurante vea sus ingresos y comisiones
- Mismos filtros de fecha que superadmin
- 4 tarjetas principales con la misma información
- Tabla resumen con desglose
- Nota informativa explicando cómo funciona la comisión
- Mensajes claros: "La plataforma Upick se queda con el X% de comisión"

**Acceso**: Ruta `/admin/commission` (agregar enlace en menú de navegación si existe)

## Endpoints de API Actualizados

### `POST /api/superadmin/restaurants`

- Acepta `commissionPercentage` en el body
- Valida que esté entre 0 y 100
- Default: 5.0% si no se proporciona

### `PATCH /api/superadmin/restaurants/[id]`

- Permite actualizar `commissionPercentage`
- Misma validación que en POST

## Cálculo de Comisiones

### Fórmula

```
commission_base = order_total (lo que pagó el usuario)
platform_commission_amount = round(commission_base * commission_percentage / 100)
net_amount_for_restaurant = commission_base - platform_commission_amount
```

### Cuándo se Calcula

- Cuando un pedido cambia su estado a `paid`
- Se ejecuta automáticamente en:
  - Webhook de Wompi (cuando se recibe confirmación de pago)
  - Verificación manual de transacción (fallback)

### Pedidos Históricos

- Los campos `platformCommissionAmount` y `netAmountForRestaurant` son nullable
- Los pedidos antiguos tendrán estos campos en `null`
- Opcional: crear script de migración para recalcular pedidos históricos usando el porcentaje actual del restaurante

## Consideraciones Técnicas

### Precisión Monetaria

- Todos los montos se almacenan en **centavos** (Int)
- Se usa `Decimal.js` para cálculos intermedios
- Redondeo: `ROUND_HALF_UP` (estándar bancario)

### Estados de Pedido

- Solo se calculan comisiones para pedidos con estado `paid`
- Se ignoran: `awaiting_payment`, `cancelled`, `refunded`, etc.

### Formato de Moneda

- Frontend usa `Intl.NumberFormat` con formato COP
- Ejemplo: `$50.000` para 5000000 centavos

## Próximos Pasos (Opcionales)

1. **Script de Migración de Pedidos Históricos**:
   - Recalcular comisiones para pedidos antiguos
   - Usar el porcentaje actual del restaurante o el que estaba vigente en ese momento

2. **Exportación de Reportes**:
   - Agregar funcionalidad de exportar métricas a CSV/Excel
   - Ya existe estructura base en `admin/metrics/page.tsx`

3. **Notificaciones**:
   - Notificar al restaurante cuando se generen reportes de comisiones
   - Enviar resumen mensual de ingresos

4. **Integración con Sistema de Payouts**:
   - Conectar con el sistema existente de `PayoutCycle`
   - Usar `netAmountForRestaurant` para calcular transferencias

## Archivos Creados/Modificados

### Nuevos Archivos

- `prisma/migrations/add_restaurant_commission_fields.sql`
- `src/lib/restaurant-commission.ts`
- `src/app/api/admin/commission-metrics/route.ts`
- `src/app/api/superadmin/restaurants/[id]/commission-metrics/route.ts`
- `src/app/admin/commission/page.tsx`
- `src/app/superadmin/restaurants/[id]/commission/page.tsx`

### Archivos Modificados

- `prisma/schema.prisma`
- `src/app/api/payments/webhook/route.ts`
- `src/app/api/payments/verify-transaction/route.ts`
- `src/app/api/superadmin/restaurants/route.ts`
- `src/app/api/superadmin/restaurants/[id]/route.ts`
- `src/app/superadmin/restaurants/page.tsx`

## Testing Recomendado

1. **Crear restaurante con comisión personalizada**:
   - Verificar que se guarda correctamente
   - Verificar que aparece en el formulario de edición

2. **Realizar pedido y pagar**:
   - Verificar que se calculan `platformCommissionAmount` y `netAmountForRestaurant`
   - Verificar que los valores son correctos según el porcentaje

3. **Ver métricas en dashboards**:
   - Superadmin: verificar que muestra correctamente las métricas
   - Admin restaurante: verificar que solo ve su propio restaurante

4. **Filtros de fecha**:
   - Probar presets (hoy, semana, mes)
   - Probar rango personalizado
   - Verificar que solo cuenta pedidos `paid`

5. **Validaciones**:
   - Intentar crear restaurante con comisión > 100% o < 0%
   - Verificar que se rechaza correctamente
