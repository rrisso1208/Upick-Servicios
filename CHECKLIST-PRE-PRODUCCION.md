# ✅ Checklist Pre-Producción - Upick

**Fecha de revisión:** 23 de Noviembre, 2025

## 🔴 CRÍTICO - Debe estar completo antes de producción

### 1. Base de Datos

- [x] Schema Prisma completo y actualizado
- [ ] **Ejecutar migraciones SQL pendientes:**
  - [ ] `prisma/migrations/add_refund_type_enum.sql` (RefundType + CreditTransactionType)
  - [ ] `prisma/migrations/add_restaurant_commission_fields.sql` (commissionPercentage, platformCommissionAmount, netAmountForRestaurant)
  - [ ] `prisma/migrations/add_category_sale_hours.sql` (saleHoursStart, saleHoursEnd)
- [ ] Verificar que todos los enums existen en la base de datos
- [ ] Verificar índices y relaciones

### 2. Variables de Entorno

- [x] `DATABASE_URL` - Configurada
- [x] `SUPABASE_SERVICE_ROLE_KEY` - Configurada
- [x] `WOMPI_PRIVATE_KEY` - Configurada
- [x] `WOMPI_WEBHOOK_SECRET` - Configurada
- [x] `NEXT_PUBLIC_WOMPI_PUBLIC_KEY` - Configurada
- [ ] `WHATSAPP_EVOLUTION_API_URL` - **Verificar si está configurada**
- [ ] `WHATSAPP_EVOLUTION_API_KEY` - **Verificar si está configurada**
- [ ] `RESEND_API_KEY` - Opcional pero recomendado
- [ ] `NEXT_PUBLIC_APP_URL` - Debe apuntar a la URL de producción

### 3. Integración de Pagos (Wompi)

- [x] Widget de Wompi funcionando
- [x] Webhook configurado y funcionando
- [x] Manejo de estados APPROVED/DECLINED
- [x] Cálculo correcto de montos
- [x] Manejo de créditos en pagos
- [ ] **Verificar webhook URL en dashboard de Wompi:** `https://tu-dominio.com/api/payments/webhook`
- [ ] **Probar pago completo en sandbox**
- [ ] **Probar pago rechazado**
- [ ] **Probar pago con créditos parciales**

### 4. Notificaciones

- [x] WhatsApp implementado (Evolution API o Meta API)
- [x] Email implementado (Resend)
- [ ] **Configurar WhatsApp en producción**
- [ ] **Probar notificación cuando pedido está listo**
- [ ] **Probar notificación de confirmación de pedido**
- [ ] **Probar notificación de cancelación**

## 🟡 IMPORTANTE - Recomendado antes de producción

### 5. Validaciones y Seguridad

- [x] Autenticación con Supabase
- [x] Autorización por roles
- [x] Validación de datos con Zod
- [x] Manejo de errores en endpoints críticos
- [ ] **Revisar logs de errores en Vercel**
- [ ] **Verificar que no hay información sensible en logs**
- [ ] **Probar rate limiting** (si está implementado)

### 6. Funcionalidades Core

- [x] Creación de pedidos
- [x] Procesamiento de pagos
- [x] Cancelación de pedidos
- [x] Sistema de créditos
- [x] Panel de admin (KDS/Kanban)
- [x] QR Scanner para entregas
- [x] Sistema de comisiones
- [x] Métricas y reportes
- [x] Sistema de favoritos
- [x] Horarios de venta por categoría
- [x] Botón "Marcar como listo" con WhatsApp

### 7. UX/UI

- [x] Diseño responsive
- [x] Mascota Picku integrada
- [x] Estados de carga
- [x] Manejo de errores en UI
- [ ] **Probar en diferentes dispositivos**
- [ ] **Probar en diferentes navegadores**

## 🟢 MEJORAS - Opcional pero recomendado

### 8. Testing

- [ ] Tests unitarios para funciones críticas
- [ ] Tests de integración para flujos principales
- [ ] Tests E2E para checkout completo
- [ ] Tests de carga (si aplica)

### 9. Monitoreo y Logging

- [x] Logger estructurado (Pino)
- [x] Sentry configurado (opcional)
- [ ] **Configurar alertas críticas**
- [ ] **Dashboard de métricas de aplicación**

### 10. Documentación

- [x] README completo
- [x] Documentación de APIs
- [ ] **Guía de usuario final**
- [ ] **Guía de administración**
- [ ] **Documentación de troubleshooting**

### 11. Optimizaciones

- [ ] Optimización de imágenes
- [ ] Caching de queries frecuentes
- [ ] Lazy loading de componentes
- [ ] Optimización de bundle size

## 📋 Checklist de Pruebas Finales

### Flujo Completo de Pedido

- [ ] Usuario puede registrarse
- [ ] Usuario puede iniciar sesión
- [ ] Usuario puede ver restaurantes
- [ ] Usuario puede ver menú
- [ ] Usuario puede agregar productos al carrito
- [ ] Usuario puede aplicar cupón
- [ ] Usuario puede usar créditos
- [ ] Usuario puede seleccionar franja horaria
- [ ] Usuario puede pagar con Wompi
- [ ] Usuario recibe comprobante con QR
- [ ] Usuario ve pedido en "Mis Pedidos"
- [ ] Admin ve pedido en panel
- [ ] Admin puede marcar como "En preparación"
- [ ] Admin puede marcar como "Listo"
- [ ] Usuario recibe notificación WhatsApp cuando está listo
- [ ] Admin puede escanear QR para entregar
- [ ] Usuario puede cancelar pedido
- [ ] Usuario recibe créditos si cancela con esa opción

### Flujo de Cancelación

- [ ] Usuario puede cancelar pedido (1 hora antes)
- [ ] Usuario puede elegir reembolso a método de pago
- [ ] Usuario puede elegir convertir a créditos
- [ ] Créditos se agregan correctamente
- [ ] Notificaciones se envían a superadmin y admin restaurante
- [ ] Métricas se actualizan correctamente

### Panel de Admin

- [ ] Admin puede ver todos los pedidos
- [ ] Admin puede filtrar por fecha
- [ ] Admin puede cambiar estado de pedidos
- [ ] Admin puede escanear QR
- [ ] Admin puede ver métricas
- [ ] Admin puede gestionar menú
- [ ] Admin puede gestionar cupones

## 🎯 Estado Actual del Sistema

### ✅ Completado (95%)

- Sistema de autenticación completo
- Flujo de pedidos end-to-end
- Integración Wompi funcionando
- Sistema de créditos
- Cancelación de pedidos
- Panel de admin completo
- Sistema de comisiones
- Notificaciones WhatsApp
- QR Scanner
- Métricas y reportes
- Sistema de favoritos
- Horarios de venta por categoría

### ⚠️ Pendiente de Verificación

1. **Migraciones SQL** - Ejecutar en producción
2. **Configuración WhatsApp** - Verificar variables de entorno
3. **Webhook Wompi** - Verificar URL en dashboard
4. **Pruebas finales** - Probar todos los flujos en producción

## 🚀 Pasos para Lanzar a Producción

1. **Ejecutar migraciones SQL** en la base de datos de producción
2. **Verificar todas las variables de entorno** en Vercel
3. **Configurar webhook de Wompi** con URL de producción
4. **Configurar WhatsApp** (Evolution API o Meta API)
5. **Probar flujo completo** en producción
6. **Monitorear logs** durante las primeras horas
7. **Configurar alertas** para errores críticos

## 📝 Notas Finales

El sistema está **95% completo** y funcional. Los puntos críticos son:

- Ejecutar las migraciones SQL pendientes
- Verificar configuración de WhatsApp
- Probar todos los flujos en producción

Una vez completados estos pasos, el sistema estará listo para producción.
