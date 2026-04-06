# 🧪 Prueba Completa del Sistema Upick

## 🎯 **OBJETIVO**
Probar el flujo completo desde que un estudiante ve el menú hasta que el restaurante entrega el pedido.

---

## ✅ **CHECKLIST PREVIO**

Antes de empezar, verifica:
- [x] Servidor corriendo en `http://localhost:3000`
- [x] Base de datos poblada con datos de prueba
- [x] Wompi configurado con credenciales reales
- [x] Supabase Auth activo

---

## 🚀 **PRUEBA 1: FLUJO ESTUDIANTE (15 min)**

### **Paso 1: Ver Restaurantes**
```
1. Abre: http://localhost:3000
2. Click en "Universidad Nacional de Colombia"
3. Deberías ver 3 restaurantes:
   - Cafetería Central
   - Burger Campus
   - Salud Verde
```

### **Paso 2: Explorar Menú**
```
1. Click en "Cafetería Central"
2. Verás productos organizados por categorías
3. Cada producto muestra:
   - Foto (si tiene)
   - Nombre
   - Precio
   - Botón "Agregar"
```

### **Paso 3: Agregar al Carrito**
```
1. Click en "Agregar" en 2-3 productos diferentes
2. Verás el botón flotante ROJO en la esquina
3. El contador debe aumentar con cada producto
4. Total debe actualizarse
```

### **Paso 4: Ir al Checkout**
```
1. Click en el botón flotante rojo del carrito
2. Serás redirigido a: /universidad-nacional/checkout
3. Verás:
   - Resumen de productos
   - Selector de franja horaria
   - Métodos de pago (PSE/Tarjeta)
```

### **Paso 5: Seleccionar Franja**
```
1. Selecciona una franja horaria disponible
   (Ej: "10:00 - 10:10")
2. La franja debe marcarse como seleccionada
```

### **Paso 6: Crear Pedido**
```
1. Click en "Pagar con Tarjeta"
2. El sistema creará:
   - El pedido en la base de datos
   - Una sesión de pago en Wompi
   - Un código de recogida de 6 dígitos
```

### **Paso 7: Pagar (Wompi)**
```
1. Serás redirigido a Wompi (o verás un link)
2. Usa la tarjeta de prueba:
   
   Número: 4242 4242 4242 4242
   CVV: 123
   Fecha: 12/25
   Nombre: Test User

3. Click "Pagar"
4. El pago será APROBADO
```

### **Paso 8: Ver Comprobante**
```
1. Serás redirigido al comprobante
2. Verás:
   - Código de recogida (6 dígitos)
   - QR code
   - Detalles del pedido
   - Franja de recogida
   - Estado: "Pagado"
```

**✅ RESULTADO ESPERADO:**
- Pedido creado exitosamente
- Pago aprobado
- Comprobante generado
- Estado "paid" en base de datos

---

## 🍳 **PRUEBA 2: FLUJO RESTAURANTE (10 min)**

### **Paso 1: Acceder al Panel Admin**
```
1. Abre: http://localhost:3000/admin/orders
2. Deberías ver el pedido que acabas de crear
3. Estado: "Pagado - En cola"
```

### **Paso 2: Verificar Realtime**
```
1. Deja abierta la pestaña del panel admin
2. En otra pestaña, haz otro pedido
3. El nuevo pedido debe aparecer AUTOMÁTICAMENTE
   (sin refrescar la página)
4. Verás el indicador verde "Actualización en tiempo real"
```

### **Paso 3: Cambiar Estado del Pedido**
```
1. Click en un pedido
2. Cambia el estado a "En preparación"
3. El pedido debe moverse a la columna correspondiente
4. Sin refrescar, el cambio debe reflejarse
```

### **Paso 4: Ver Métricas**
```
1. Ve a: http://localhost:3000/admin/metrics
2. Verás:
   - Ventas totales
   - Ticket promedio
   - Pedidos por estado
   - Productos más vendidos
```

### **Paso 5: Gestionar Menú**
```
1. Ve a: http://localhost:3000/admin/menu
2. Verás todos los productos
3. Puedes:
   - Crear nuevos productos
   - Editar existentes
   - Cambiar disponibilidad
   - Subir imágenes
```

**✅ RESULTADO ESPERADO:**
- Panel admin funcional
- Realtime updates funcionando
- Métricas mostrando datos
- CRUD de menú operativo

---

## 📱 **PRUEBA 3: VALIDACIÓN QR (5 min)**

### **Paso 1: Marcar como Listo**
```
1. En el panel admin (/admin/orders)
2. Cambia el estado del pedido a "Listo para recoger"
3. El pedido se mueve a la columna "Listos"
```

### **Paso 2: Escanear/Validar Código**
```
1. Ve a: http://localhost:3000/admin/scan
2. Ingresa el código de recogida (6 dígitos)
3. Click "Validar y Entregar"
4. Verás:
   - Información del pedido
   - Datos del cliente
   - Total del pedido
```

### **Paso 3: Verificar Entrega**
```
1. El sistema marca automáticamente como "Entregado"
2. El pedido se mueve a la columna "Entregados"
3. El estudiante recibe actualización en tiempo real
```

**✅ RESULTADO ESPERADO:**
- Código QR validado correctamente
- Pedido marcado como entregado
- Actualización en tiempo real

---

## 👑 **PRUEBA 4: PANEL SUPERADMIN (5 min)**

### **Paso 1: Ver Dashboard**
```
1. Ve a: http://localhost:3000/superadmin/dashboard
2. Verás métricas globales de todas las universidades
```

### **Paso 2: Gestionar Universidades**
```
1. Ve a: http://localhost:3000/superadmin/universities
2. Verás lista de universidades
3. Puedes crear/editar/desactivar
```

### **Paso 3: Gestionar Restaurantes**
```
1. Ve a: http://localhost:3000/superadmin/restaurants
2. Verás todos los restaurantes
3. Puedes asignar admins, cambiar configuración
```

**✅ RESULTADO ESPERADO:**
- Visibilidad global del sistema
- Control sobre universidades y restaurantes
- Métricas consolidadas

---

## 🎯 **CHECKLIST DE FUNCIONALIDADES**

### **Core Features:**
- [ ] Ver menú de restaurantes ✅
- [ ] Agregar productos al carrito ✅
- [ ] Seleccionar franja de recogida ✅
- [ ] Crear pedido ✅
- [ ] Pagar con Wompi ✅
- [ ] Recibir comprobante con QR ✅
- [ ] Ver pedido en panel admin ✅
- [ ] Cambiar estado del pedido ✅
- [ ] Validar código de recogida ✅
- [ ] Marcar como entregado ✅

### **Features Avanzadas:**
- [ ] Realtime updates (automático) ✅
- [ ] Métricas en tiempo real ✅
- [ ] CRUD de menú ✅
- [ ] Panel superadmin ✅
- [ ] Sistema de comisiones (automático) ✅
- [ ] Reserva de slots (anti-filas) ✅

---

## 🐛 **SI ALGO FALLA**

### **Pedido no se crea:**
```bash
# Ver logs del servidor en la terminal
# Busca errores en rojo
```

### **Pago no se procesa:**
```bash
# Verifica credenciales Wompi
Get-Content .env | Select-String "WOMPI"

# Prueba conexión
node scripts/test-wompi.js
```

### **Realtime no funciona:**
```
1. Verifica que Supabase Realtime esté habilitado
2. Dashboard Supabase → Database → Replication
3. Habilita tabla "Order"
```

### **Panel admin no carga:**
```
1. Verifica que estés logueado
2. Ve a: http://localhost:3000/auth/login
3. Usa: admin@cafeteria-central.com
```

---

## 📊 **MÉTRICAS DE ÉXITO**

Al finalizar las pruebas deberías tener:

| Métrica | Esperado |
|---------|----------|
| Pedidos creados | ≥2 |
| Pagos aprobados | ≥2 |
| Estados cambiados | ≥4 |
| Códigos validados | ≥1 |
| Realtime events | ≥3 |
| Cero errores | ✅ |

---

## ✨ **SIGUIENTE NIVEL**

Después de las pruebas básicas:

1. **Configurar Webhook** (para notificaciones automáticas)
2. **Personalizar branding** (colores, logo)
3. **Agregar más productos** al menú
4. **Invitar usuarios reales** a probar
5. **Deploy a producción** (Vercel)

---

## 🎉 **FELICITACIONES**

Si todas las pruebas pasan, tienes un sistema 100% funcional de:
- ✅ Pedidos online
- ✅ Pagos automatizados
- ✅ Gestión de restaurantes
- ✅ Sistema anti-filas
- ✅ Realtime updates
- ✅ Validación QR

**¡Tu MVP está listo para lanzar!** 🚀


