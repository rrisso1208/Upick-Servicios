# 💳 Guía Completa de Configuración Wompi

**Fecha:** Noviembre 10, 2025  
**Tiempo estimado:** 15 minutos

---

## 📋 **PASO 1: Crear Cuenta Wompi (5 min)**

### **Opción A: Modo Sandbox (Recomendado para pruebas)**

1. **Ir a:** https://comercios.wompi.co/signup
2. **Completar registro:**
   - Nombre completo
   - Email
   - Contraseña
   - Número de teléfono
3. **Verificar email** (click en el link que te envían)
4. **Login:** https://comercios.wompi.co/login

---

## 🔑 **PASO 2: Obtener Credenciales (3 min)**

Una vez dentro del dashboard:

### **1. Activar Modo Sandbox:**
```
Dashboard → Configuración → Modo de Operación
→ Seleccionar "Sandbox (Pruebas)"
```

### **2. Copiar las Keys:**
```
Dashboard → Integraciones → API Keys
```

Verás 4 keys diferentes:

#### **Para Sandbox (Pruebas):**
- ✅ **Public Key (Sandbox):** `pub_test_xxxxxxxxxx`
- ✅ **Private Key (Sandbox):** `prv_test_xxxxxxxxxx`

#### **Para Producción (cuando estés listo):**
- 🔒 **Public Key (Producción):** `pub_prod_xxxxxxxxxx`
- 🔒 **Private Key (Producción):** `prv_prod_xxxxxxxxxx`

**¡Guarda estas keys en un lugar seguro!**

---

## ⚙️ **PASO 3: Configurar Variables de Entorno (2 min)**

Abre tu archivo `.env` y actualiza estas líneas:

```env
# ====================
# WOMPI (Sandbox)
# ====================
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_test_TU_PUBLIC_KEY_AQUI
WOMPI_PRIVATE_KEY=prv_test_TU_PRIVATE_KEY_AQUI
WOMPI_WEBHOOK_SECRET=mi-secreto-super-seguro-123
WOMPI_API_URL=https://sandbox.wompi.co/v1
```

**⚠️ IMPORTANTE:**
- Reemplaza `TU_PUBLIC_KEY_AQUI` y `TU_PRIVATE_KEY_AQUI` con tus keys reales
- El `WOMPI_WEBHOOK_SECRET` puede ser cualquier texto secreto (guárdalo bien)
- Para producción, cambiar URL a: `https://production.wompi.co/v1`

---

## 🔔 **PASO 4: Configurar Webhook (5 min)**

Los webhooks son CRÍTICOS para que Wompi te notifique cuando un pago es aprobado/rechazado.

### **1. Crear URL pública del webhook:**

**Opciones:**

#### **A) Desarrollo Local con ngrok (Recomendado):**
```bash
# Instalar ngrok
npm install -g ngrok

# Exponer tu servidor local
ngrok http 3000

# Ngrok te dará una URL como:
# https://abc123.ngrok.io
```

#### **B) Deploy temporal en Vercel:**
```bash
vercel --prod
# Te dará una URL como: https://upic-xyz.vercel.app
```

### **2. Configurar en Wompi:**

```
Dashboard → Integraciones → Webhooks
→ Click "Agregar Webhook"
```

**Configuración:**
```
URL del Webhook: https://TU-DOMINIO/api/payments/webhook
Ejemplo: https://abc123.ngrok.io/api/payments/webhook

Eventos a escuchar:
✅ transaction.updated

Método: POST
```

### **3. Obtener Secret del Webhook:**

Wompi puede generar un secret automáticamente, O puedes usar el que pusiste en `.env`:
```
Dashboard → Integraciones → Webhooks → Ver Detalles
→ Copiar "Webhook Secret"
```

**Actualiza tu `.env` con este secret:**
```env
WOMPI_WEBHOOK_SECRET=el-secret-que-copiaste-de-wompi
```

---

## ✅ **PASO 5: Reiniciar Servidor (1 min)**

Para que las nuevas variables de entorno se carguen:

```bash
# Si el servidor está corriendo, detenerlo (Ctrl+C)
# Luego reiniciar:
pnpm dev
```

---

## 🧪 **PASO 6: Probar la Integración (10 min)**

### **1. Crear un pedido de prueba:**

```bash
# Abre el navegador en:
http://localhost:3000
```

**Flujo completo:**
1. Selecciona "Universidad Nacional"
2. Entra a "Cafetería Central"
3. Agrega productos al carrito
4. Click en el botón flotante del carrito
5. Selecciona franja de recogida
6. Click "Pagar con PSE" o "Pagar con Tarjeta"

### **2. Verás el link de pago:**

El sistema te dará una URL de Wompi como:
```
https://checkout.wompi.co/l/xxxxxxxxx
```

### **3. Usar tarjetas de prueba (Sandbox):**

Wompi proporciona estas tarjetas para testing:

#### **✅ Transacción Aprobada:**
```
Número: 4242 4242 4242 4242
CVV: 123
Fecha: Cualquier fecha futura (ej: 12/25)
```

#### **❌ Transacción Declinada:**
```
Número: 4111 1111 1111 1111
CVV: 123
Fecha: Cualquier fecha futura
```

#### **⏳ Pago Pendiente (PSE):**
```
Banco: Banco de Pruebas
Tipo: Persona Natural
Documento: 123456789
```

### **4. Verificar en el panel:**

Después de pagar:
```
http://localhost:3000/admin/orders
```

El pedido debe aparecer automáticamente con estado "paid" gracias al webhook.

---

## 📊 **PASO 7: Verificar Logs (Debugging)**

### **Ver logs de Wompi:**
```
Dashboard Wompi → Transacciones
→ Busca tu transacción por monto o fecha
```

### **Ver logs de tu aplicación:**
```bash
# En la terminal donde corre pnpm dev verás:
✅ Creating Wompi payment session
✅ Wompi session created
✅ Webhook received
✅ Payment approved
```

### **Verificar webhooks:**
```
Dashboard Wompi → Webhooks → Logs
→ Verifica que los webhooks llegaron exitosamente (200 OK)
```

---

## 🚨 **PROBLEMAS COMUNES Y SOLUCIONES**

### **1. Error: "Invalid API Key"**
```
✅ Solución: Verifica que copiaste las keys correctamente
✅ Asegúrate de usar keys de SANDBOX si estás en modo prueba
✅ No incluyas espacios antes/después de las keys
```

### **2. Webhook no llega**
```
✅ Verifica que la URL sea accesible desde internet
✅ Si usas ngrok, asegúrate que esté corriendo
✅ Revisa los logs en Wompi → Webhooks
✅ Verifica que el WOMPI_WEBHOOK_SECRET coincida
```

### **3. Pago aprobado pero pedido no cambia de estado**
```
✅ Verifica que el webhook esté configurado
✅ Revisa los logs de la app (terminal)
✅ Verifica que la URL del webhook sea correcta
```

### **4. Error: "CORS" o "Network Error"**
```
✅ Verifica que NEXT_PUBLIC_APP_URL esté correcta en .env
✅ Reinicia el servidor después de cambiar .env
```

---

## 🎯 **CHECKLIST DE VERIFICACIÓN**

Antes de considerar Wompi configurado:

- [ ] Cuenta Wompi creada y verificada
- [ ] Keys copiadas y pegadas en `.env`
- [ ] Webhook configurado y activo
- [ ] Servidor reiniciado con nuevas variables
- [ ] Pedido de prueba creado exitosamente
- [ ] Link de pago generado correctamente
- [ ] Pago realizado con tarjeta de prueba
- [ ] Webhook recibido (ver logs)
- [ ] Pedido cambió a estado "paid"
- [ ] Notificaciones enviadas (opcional)

---

## 🚀 **PASO A PRODUCCIÓN**

Cuando estés listo para pagos reales:

### **1. Activar cuenta de producción:**
```
Dashboard → Configuración → Modo de Operación
→ Seleccionar "Producción"
```

### **2. Completar verificación:**
Wompi te pedirá:
- Documento de identidad
- Datos bancarios
- Información del negocio

### **3. Actualizar `.env`:**
```env
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_prod_xxxxxxxxxx
WOMPI_PRIVATE_KEY=prv_prod_xxxxxxxxxx
WOMPI_API_URL=https://production.wompi.co/v1
```

### **4. Actualizar webhook:**
```
URL del Webhook: https://tu-dominio-real.com/api/payments/webhook
```

---

## 📞 **SOPORTE**

**Documentación Wompi:**
- https://docs.wompi.co

**Soporte Wompi:**
- soporte@wompi.co
- WhatsApp: +57 310 123 4567 (ejemplo)

**Tu integración:**
- Código: `src/lib/payments/wompi.ts`
- Webhook: `src/app/api/payments/webhook/route.ts`
- Session: `src/app/api/payments/session/route.ts`

---

## ✨ **CARACTERÍSTICAS IMPLEMENTADAS**

Tu integración incluye:

✅ **Pagos PSE y Tarjeta**
✅ **Links de pago**
✅ **Webhooks con validación de firma**
✅ **Idempotencia** (evita duplicados)
✅ **Cálculo automático de comisiones**
✅ **Reserva de franjas horarias**
✅ **Notificaciones automáticas**
✅ **Logs estructurados**
✅ **Manejo de errores robusto**

---

**¡Listo! Tu integración de Wompi está completa y lista para usar.** 🎉


