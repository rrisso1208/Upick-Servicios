# 📝 Changelog - Upick

## [Sesión Actual] - Noviembre 8, 2025

### ✅ Completado

#### **Branding y Diseño**
- ✅ Cambiado esquema de colores de azul a **rojo** (`#dc2626`)
- ✅ Renombrado "UPIC" → **"Upick"** en toda la aplicación
- ✅ Actualizado manifest.json y metadata
- ✅ Actualizado todos los componentes UI con colores rojos

#### **Setup y Configuración**
- ✅ Proyecto inicializado con Next.js 15 + TypeScript
- ✅ Base de datos Supabase conectada (Session Pooler IPv4)
- ✅ 16 tablas creadas con Prisma
- ✅ Datos de prueba insertados (3 restaurantes, 5 productos, 3 usuarios)
- ✅ Servidor funcionando en puerto 3002

#### **Funcionalidades Implementadas**
- ✅ **Menú funcional** con datos reales de base de datos
- ✅ **Sistema de carrito** completo con localStorage
- ✅ **ProductCard** con opciones configurables
- ✅ **CartButton** flotante con contador
- ✅ **Página de checkout** completa con:
  - Resumen de carrito
  - Selector de franjas (SlotPicker)
  - Selector de método de pago
  - Integración con API de pedidos y pagos

#### **API Endpoints Funcionando**
- ✅ `GET /api/campus/:slug/restaurants`
- ✅ `GET /api/restaurants/:slug/menu`
- ✅ `GET /api/restaurants/by-id/:id/slots`
- ✅ `POST /api/orders`
- ✅ `POST /api/payments/session`
- ✅ `POST /api/payments/webhook`

#### **Correcciones de Errores**
- ✅ Resuelto conflicto de rutas dinámicas `[id]` vs `[slug]`
- ✅ Eliminado favicon placeholder que causaba error
- ✅ Configurado `next.config.js` para evitar warnings
- ✅ Solucionado problema de conexión DB (Session Pooler)

---

## 🎯 Estado Actual

**Funcional:**
- ✅ Home con lista de universidades
- ✅ Lista de restaurantes por campus
- ✅ Menú completo con productos reales
- ✅ Agregar productos al carrito
- ✅ Ver carrito con totales
- ✅ Checkout con selección de franjas
- ✅ Selección de método de pago
- ✅ Creación de orden (API)

**En desarrollo:**
- 🟡 Integración completa con Wompi (necesita configuración)
- 🟡 Autenticación de usuarios (código listo, falta UI)
- 🟡 Panel admin funcional (básico)
- 🟡 Panel superadmin (básico)

---

## 📊 Métricas

- **Archivos creados:** ~100+
- **Líneas de código:** ~10,000+
- **Componentes UI:** 10+
- **Páginas:** 15+
- **API Endpoints:** 15+
- **Modelos DB:** 16
- **Tests:** 2 (necesita más)

---

## 🚀 Próximos Pasos

### Inmediato:
1. Probar flujo completo de checkout
2. Configurar Wompi para pagos reales
3. Implementar autenticación completa

### Esta semana:
1. CRUD de menú para admin
2. Métricas reales con queries SQL
3. Realtime updates

### Próxima semana:
1. Panel superadmin completo
2. Sistema de notificaciones
3. Validación de QR
4. Tests E2E

---

## 🐛 Issues Conocidos

- ⚠️ Warning de DLL en Windows (cosmético, no afecta funcionalidad)
- ⚠️ Algunos componentes usan datos mock (se reemplazarán)
- ⚠️ Faltan tests E2E
- ⚠️ Falta configuración de Wompi productivo

---

## 💡 Notas Técnicas

- **Puerto:** 3002 (3000 ocupado por otro proyecto)
- **Base de datos:** Session Pooler en puerto 5432
- **Colores primarios:** Rojo (#dc2626 a #7f1d1d)
- **Framework:** Next.js 15.5.6
- **ORM:** Prisma 5.22.0


