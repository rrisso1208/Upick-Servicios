# 🚀 Upick - Roadmap de Desarrollo

**Objetivo:** Sistema perfecto, escalable y listo para producción

**Estado actual:** ✅ MVP funcional (80%)
**Meta:** 🎯 Producto completo (100%)

---

## 📊 PRIORIDADES (Críticas a Implementar)

### 🔴 **ALTA PRIORIDAD** (Semana 1-2)

#### 1. **Completar Flujo de Checkout** ⭐ CRÍTICO
**Status:** 🟡 50% - Falta integración completa

**Lo que hay:**
- ✅ Componente SlotPicker
- ✅ Página de checkout básica
- ✅ API de crear orden
- ✅ API de payment session

**Lo que falta:**
- [ ] Menú funcional con "Agregar al carrito"
- [ ] Carrito persistente en localStorage
- [ ] Flujo completo: menú → carrito → slot → pago
- [ ] Validación de disponibilidad de productos
- [ ] Manejo de opciones de productos (tamaños, extras)

**Archivos a modificar:**
- `src/app/[university]/[restaurant]/page.tsx` - Menú con carrito
- `src/app/checkout/page.tsx` - Integrar carrito + SlotPicker
- `src/lib/cart.ts` - Ya está ✅

**Tiempo estimado:** 4-6 horas

---

#### 2. **Autenticación Completa** 🔐
**Status:** 🟡 70% - Código listo, falta UI

**Lo que hay:**
- ✅ Supabase Auth configurado
- ✅ Middleware de auth
- ✅ RBAC (roles y permisos)
- ✅ Página de login básica

**Lo que falta:**
- [ ] Flujo de signup completo
- [ ] Protección de rutas (middleware)
- [ ] Sesiones persistentes
- [ ] UI de perfil de usuario
- [ ] Cambio de contraseña
- [ ] Logout

**Archivos a crear/modificar:**
- `src/app/auth/signup/page.tsx`
- `src/middleware.ts` - Proteger rutas
- `src/components/auth/AuthProvider.tsx`
- `src/components/auth/UserMenu.tsx`

**Tiempo estimado:** 3-4 horas

---

#### 3. **CRUD Completo de Menú** 📝
**Status:** 🟡 40% - API lista, UI básica

**Lo que hay:**
- ✅ API de productos (GET, POST, PATCH, DELETE)
- ✅ UI básica en `/admin/menu`

**Lo que falta:**
- [ ] Modal completo para crear/editar productos
- [ ] Upload de imágenes (Supabase Storage)
- [ ] Gestión de categorías
- [ ] Gestión de opciones de productos
- [ ] Drag & drop para reordenar
- [ ] Duplicar productos
- [ ] Búsqueda y filtros

**Archivos a modificar:**
- `src/app/admin/menu/page.tsx` - Interfaz completa
- `src/app/api/admin/categories/route.ts` - CRUD categorías
- `src/app/api/admin/upload/route.ts` - Subir imágenes
- `src/components/admin/ProductModal.tsx` - Modal nuevo

**Tiempo estimado:** 6-8 horas

---

#### 4. **Métricas y Reportes Reales** 📊
**Status:** 🔴 30% - UI mock, falta backend

**Lo que hay:**
- ✅ UI de métricas con datos mock
- ✅ Queries SQL base en documentación

**Lo que falta:**
- [ ] Endpoint `/api/admin/metrics` funcional
- [ ] Queries optimizadas con índices
- [ ] Exportación CSV
- [ ] Exportación Excel
- [ ] Gráficos con Recharts
- [ ] Filtros por fecha
- [ ] Comparación de períodos

**Archivos a crear:**
- `src/app/api/admin/metrics/route.ts`
- `src/app/api/admin/export/route.ts`
- `src/lib/metrics.ts` - Queries reutilizables
- `src/components/admin/MetricsChart.tsx`

**Tiempo estimado:** 5-7 horas

---

### 🟡 **MEDIA PRIORIDAD** (Semana 3-4)

#### 5. **Panel Superadmin Completo** 👑
**Status:** 🔴 20% - Solo dashboard básico

**Lo que falta:**
- [ ] CRUD de universidades
- [ ] CRUD de restaurantes
- [ ] Gestión de usuarios admin
- [ ] Configuración de políticas de comisión (UI)
- [ ] Liquidaciones y cierre de períodos
- [ ] Generación de facturas PDF
- [ ] Métricas globales por universidad

**Archivos a crear:**
- `src/app/superadmin/universities/page.tsx`
- `src/app/superadmin/restaurants/page.tsx`
- `src/app/superadmin/commissions/page.tsx`
- `src/app/superadmin/payouts/page.tsx`
- `src/app/api/superadmin/*` - Múltiples endpoints
- `src/lib/pdf-generator.ts` - Para facturas

**Tiempo estimado:** 10-12 horas

---

#### 6. **Realtime Updates** 🔄
**Status:** 🔴 0% - Por implementar

**Objetivo:**
- Pedidos se actualizan automáticamente en KDS
- Notificaciones en tiempo real para estudiantes
- Estado de pedido actualizado sin refrescar

**Implementación:**
```typescript
// Supabase Realtime Channel
const channel = supabase
  .channel('orders')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'Order',
    filter: `restaurantId=eq.${restaurantId}`
  }, (payload) => {
    // Actualizar UI automáticamente
  })
  .subscribe();
```

**Archivos a modificar:**
- `src/app/admin/orders/page.tsx` - Suscribir a cambios
- `src/hooks/useRealtimeOrders.ts` - Hook personalizado
- Habilitar Realtime en Supabase (Settings > Replication)

**Tiempo estimado:** 3-4 horas

---

#### 7. **Sistema de Notificaciones** 📧
**Status:** 🟡 60% - Código listo, falta configuración

**Lo que hay:**
- ✅ Templates de email
- ✅ Integración con Resend
- ✅ Integración con WhatsApp

**Lo que falta:**
- [ ] Configurar cuenta Resend
- [ ] Templates HTML profesionales
- [ ] Configurar WhatsApp Business
- [ ] Notificaciones push (web)
- [ ] Preferencias de notificación por usuario

**Pasos de configuración:**
1. Crear cuenta Resend (gratis 3k emails/mes)
2. Verificar dominio
3. Actualizar `.env` con API key
4. Diseñar templates en React Email

**Tiempo estimado:** 4-5 horas

---

#### 8. **Validación de QR para Entrega** 📱
**Status:** 🔴 0% - Por implementar

**Funcionalidad:**
- Admin escanea QR del estudiante
- Valida código de recogida
- Marca pedido como "entregado"
- Historial de entregas

**Implementación:**
- Instalar: `react-qr-reader`
- Crear: `src/app/admin/scan/page.tsx`
- API: `POST /api/admin/orders/:id/deliver`

**Tiempo estimado:** 2-3 horas

---

### 🟢 **BAJA PRIORIDAD** (Semana 5+)

#### 9. **Tests E2E Completos** 🧪
- [ ] Test de checkout completo
- [ ] Test de webhook de pagos
- [ ] Test de cambio de estados
- [ ] Test de métricas
- [ ] Coverage > 70%

**Tiempo estimado:** 6-8 horas

---

#### 10. **Optimizaciones de Performance** ⚡
- [ ] Image optimization (Next/Image)
- [ ] Lazy loading de componentes
- [ ] ISR (Incremental Static Regeneration)
- [ ] Caching de API
- [ ] Code splitting
- [ ] Bundle analysis
- [ ] Lighthouse score > 90

**Tiempo estimado:** 4-6 horas

---

## 📈 PROGRESO ESTIMADO

| Fase | Tareas | Tiempo | Estado |
|------|--------|--------|--------|
| **Setup** | Configuración base | ✅ 8h | 100% |
| **MVP** | Funcionalidades básicas | ✅ 20h | 80% |
| **Core Features** | Checkout, Auth, CRUD | 🟡 20h | 20% |
| **Advanced** | Realtime, Notifs, QR | 🔴 12h | 0% |
| **Admin/Super** | Paneles completos | 🔴 15h | 30% |
| **Polish** | Tests, Optimización | 🔴 10h | 10% |
| **Total** | | ~85h | ~50% |

---

## 🎯 PLAN RECOMENDADO

### **Esta Semana (20h):**
1. ✅ Checkout completo funcional
2. ✅ Auth y protección de rutas
3. ✅ CRUD de menú con imágenes
4. ✅ Métricas reales

**Al final de la semana:** Estudiantes podrán ordenar y pagar (flujo completo)

### **Próxima Semana (15h):**
1. ✅ Panel superadmin completo
2. ✅ Realtime updates
3. ✅ Notificaciones configuradas
4. ✅ Validación QR

**Al final:** Sistema completamente funcional

### **Semana 3 (10h):**
1. ✅ Tests E2E
2. ✅ Optimizaciones
3. ✅ Documentación final
4. ✅ Deploy a Vercel

**Al final:** Listo para producción

---

## 🚀 EMPECEMOS

**¿Por dónde quieres que empiece?**

**A) 🛒 Checkout completo** (más crítico - permitir ordenar)
**B) 🔐 Autenticación** (proteger rutas y usuarios reales)
**C) 📝 CRUD de menú** (para que restaurantes gestionen sus productos)
**D) 📊 Métricas reales** (reportes y exportes)
**E) 👑 Panel superadmin** (gestión global)

O dime **tus prioridades específicas** y empiezo por ahí. 💪

**¿Cuál quieres que implemente primero?**

