# 🚀 Guía Rápida Wompi - 5 Minutos

## ✅ **ESTADO ACTUAL**

Tu configuración:
- ✅ Variables en `.env` creadas
- ❌ Keys con formato inválido (necesitan actualizarse)
- ✅ Código de integración completo

---

## 🔑 **PASO 1: OBTENER KEYS CORRECTAS (3 min)**

### **Opción A: Usar Wompi Real (Recomendado)**

1. **Registrarse en Wompi:**
   ```
   https://comercios.wompi.co/signup
   ```

2. **Completar registro:**
   - Nombre y email
   - Verificar email
   - Login

3. **Obtener Keys de Sandbox:**
   ```
   Dashboard → Integraciones → API Keys
   ```
   
   Busca las keys que empiezan con:
   - `pub_test_...` (Public Key)
   - `prv_test_...` (Private Key)

### **Opción B: Usar Keys de Prueba de Wompi**

Si no quieres registrarte todavía, Wompi provee keys públicas para testing:

```env
# Keys de prueba públicas de Wompi
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_test_QhVoFZxMTuwUSgovMSNxoDWwXJGohvwb
WOMPI_PRIVATE_KEY=prv_test_nXF5U4yBU85x3jzP19QGQiHt0oBGxkgP
```

---

## ⚙️ **PASO 2: ACTUALIZAR .ENV**

Abre tu archivo `.env` y actualiza estas líneas:

```env
# ====================
# WOMPI
# ====================
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_test_PEGA_TU_KEY_AQUI
WOMPI_PRIVATE_KEY=prv_test_PEGA_TU_KEY_AQUI
WOMPI_WEBHOOK_SECRET=mi-super-secreto-123456
WOMPI_API_URL=https://sandbox.wompi.co/v1
```

**⚠️ IMPORTANTE:**
- Las keys deben empezar con `pub_test_` y `prv_test_`
- No incluyas espacios
- El webhook secret puede ser cualquier texto (mínimo 16 caracteres)

---

## 🔄 **PASO 3: REINICIAR SERVIDOR**

```bash
# Detener servidor (Ctrl+C en la terminal donde corre)
# Luego reiniciar:
pnpm dev
```

---

## 🧪 **PASO 4: PROBAR LA INTEGRACIÓN**

### **Test Rápido Automático:**
```bash
node test-wompi.js
```

Si ves `✅ Conexión exitosa`, ¡todo funciona!

### **Test Manual en la App:**

1. Abre: http://localhost:3000
2. Navega: Universidad → Restaurante
3. Agrega productos al carrito
4. Ve al checkout
5. Intenta crear un pedido

El sistema generará un link de pago de Wompi.

---

## 🔔 **PASO 5: CONFIGURAR WEBHOOK (Opcional para testing local)**

Para desarrollo local con webhooks:

### **A) Instalar ngrok:**
```bash
npm install -g ngrok
```

### **B) Exponer tu servidor:**
```bash
ngrok http 3000
```

Esto te dará una URL como: `https://abc123.ngrok.io`

### **C) Configurar en Wompi:**
```
Dashboard → Integraciones → Webhooks
URL: https://abc123.ngrok.io/api/payments/webhook
Eventos: transaction.updated
```

---

## 💳 **TARJETAS DE PRUEBA**

Para pagos en Sandbox:

### **✅ Aprobada:**
```
Número: 4242424242424242
CVV: 123
Fecha: 12/25
```

### **❌ Rechazada:**
```
Número: 4111111111111111
CVV: 123
Fecha: 12/25
```

---

## ❓ **PROBLEMAS COMUNES**

### **"Formato inválido" al probar:**
- Verifica que las keys empiecen con `pub_test_` y `prv_test_`
- Copia las keys sin espacios
- Reinicia el servidor

### **"No se especificó método de pago":**
- Esto es normal en el test automático
- La app maneja esto correctamente en el flujo real

### **Webhook no llega:**
- Necesitas ngrok para desarrollo local
- O espera a hacer deploy a Vercel (webhook funcionará automáticamente)

---

## 🎯 **VERIFICACIÓN RÁPIDA**

Checklist de 1 minuto:

```bash
# 1. Verificar que las keys estén en .env
cat .env | grep WOMPI

# 2. Reiniciar servidor
pnpm dev

# 3. Probar conexión
node test-wompi.js
```

Si todo muestra ✅, ¡estás listo!

---

## 🚀 **SIGUIENTE PASO**

Ahora puedes:
1. ✅ Crear pedidos en la app
2. ✅ Generar links de pago
3. ✅ Probar con tarjetas de prueba
4. ⏳ Configurar webhook (cuando estés listo)

---

**¿Necesitas ayuda?** Revisa `CONFIGURACION-WOMPI.md` para la guía completa.


