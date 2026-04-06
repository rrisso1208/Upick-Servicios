# 📋 Pendientes por Implementar - Upick

**Fecha:** Diciembre 2024  
**Estado Actual:** ~90% Funcional

---

## 🔴 ALTA PRIORIDAD

### 1. **Formulario de Reseñas en Pedidos Completados** ⏳

**Estado:** ✅ IMPLEMENTADO
**Ubicación:** `src/app/orders/[id]/receipt/OrderReceiptClient.tsx`

**Notas:**
- Ya existe `ReviewForm` en la página de comprobante.
- Se muestra cuando el estado es `delivered`.
- Permite reseñar restaurante o productos.

---

### 2. **Mostrar Reseñas Individuales en Página del Restaurante** ⏳

**Estado:** ✅ IMPLEMENTADO
**Ubicación:** `src/app/[universitySlug]/[restaurantSlug]/MenuClient.tsx`

**Notas:**
- Ya existe `ReviewsList` en la página del restaurante.
- Muestra reseñas públicas (solo rating por ahora en la lista pública, pero el backend soporta comentarios).

---

### 3. **Paginación en Listas** ⏳

**Estado:** No implementado  
**Ubicación:** Múltiples páginas

**Qué falta:**

- Paginación en lista de reseñas (admin y público)
- Paginación en lista de cupones
- Paginación en lista de pedidos
- Paginación en lista de productos (si hay muchos)

**Archivos a modificar:**

- `src/app/admin/reviews/page.tsx` - Agregar paginación
- `src/app/admin/coupons/page.tsx` - Agregar paginación
- `src/app/admin/orders/page.tsx` - Agregar paginación
- Crear componente `Pagination` reutilizable

**Tiempo estimado:** 3-4 horas

---

## 🟡 MEDIA PRIORIDAD

### 4. **Estadísticas de Cupones en Admin Panel** ⏳

**Estado:** No implementado  
**Ubicación:** `src/app/admin/coupons/page.tsx`

**Qué falta:**

- Cards con estadísticas:
  - Total de cupones creados
  - Cupones activos
  - Cupones usados
  - Descuento total otorgado
  - Cupón más usado
- Gráfico de uso de cupones por fecha
- Exportar reporte de cupones

**Tiempo estimado:** 2-3 horas

---

### 5. **Mejoras en Panel de Reseñas Admin** ⏳

**Estado:** Implementado básico, falta mejorar

**Qué falta:**

- Filtro por producto
- Búsqueda por texto (en comentarios)
- Exportar reseñas a CSV
- Responder a reseñas (opcional)
- Marcar reseñas como leídas/no leídas

**Tiempo estimado:** 3-4 horas

---

### 6. **Testing Adicional** ⏳

**Estado:** Parcialmente implementado (solo tests básicos)

**Qué falta:**

- Tests para APIs de reseñas
- Tests para APIs de cupones
- Tests E2E con Playwright:
  - Flujo completo de pedido
  - Crear reseña
  - Aplicar cupón
- Tests de componentes UI

**Tiempo estimado:** 4-6 horas

---

## 🟢 BAJA PRIORIDAD

### 7. **Notificaciones Push** ⏳

**Estado:** No implementado

**Qué falta:**

- Integración con servicio de push notifications
- Notificar cuando pedido está listo
- Notificar cuando hay nueva reseña (admin)
- Notificar cuando cupón está por expirar

**Tiempo estimado:** 4-5 horas

---

### 8. **Sistema de Respuestas a Reseñas** ⏳

**Estado:** No implementado

**Qué falta:**

- Modelo `ReviewResponse` en Prisma
- API para responder reseñas
- UI para mostrar respuestas
- Notificación al usuario cuando admin responde

**Tiempo estimado:** 3-4 horas

---

### 9. **Analytics Avanzados** ⏳

**Estado:** Básico implementado

**Qué falta:**

- Dashboard con gráficos interactivos
- Análisis de tendencias de ventas
- Predicción de demanda
- Análisis de sentimiento de reseñas

**Tiempo estimado:** 6-8 horas

---

### 10. **Optimizaciones de Performance** ⏳

**Estado:** Parcialmente implementado (SWR, imágenes optimizadas)

**Qué falta:**

- Implementar ISR (Incremental Static Regeneration) donde aplique
- Lazy loading de componentes pesados
- Code splitting más agresivo
- Optimizar queries N+1 restantes
- Implementar Redis para cache (opcional)

**Tiempo estimado:** 4-6 horas

---

## 📊 RESUMEN POR PRIORIDAD

### 🔴 Alta Prioridad (Crítico para MVP)

1. Formulario de reseñas en pedidos completados
2. Mostrar reseñas en página del restaurante
3. Paginación en listas

**Tiempo total:** ~7-10 horas

### 🟡 Media Prioridad (Mejoras importantes)

4. Estadísticas de cupones
5. Mejoras en panel de reseñas
6. Testing adicional

**Tiempo total:** ~9-13 horas

### 🟢 Baja Prioridad (Nice to have)

7. Notificaciones push
8. Sistema de respuestas
9. Analytics avanzados
10. Optimizaciones avanzadas

**Tiempo total:** ~17-23 horas

---

## 🎯 RECOMENDACIÓN

**Para MVP completo:**

- Implementar los 3 items de Alta Prioridad
- Total: ~7-10 horas de desarrollo

**Para versión mejorada:**

- Alta + Media Prioridad
- Total: ~16-23 horas de desarrollo

---

## ✅ YA IMPLEMENTADO

- ✅ Sistema de reseñas (modelos, APIs básicas)
- ✅ Sistema de cupones (modelos, APIs, UI admin)
- ✅ Panel de reseñas para admin (con comentarios)
- ✅ Visualización de rating promedio en restaurantes
- ✅ Optimización de imágenes
- ✅ SWR hooks para cache
- ✅ Sentry para monitoreo
- ✅ Tests básicos (orders, auth)

---

**Última actualización:** Diciembre 2024
