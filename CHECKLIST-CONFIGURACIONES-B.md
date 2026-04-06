# 🚀 OPCIÓN B: Configuraciones Finales - CHECKLIST

## ✅ 1. Configurar Horarios por Defecto

**Estado:** ✅ Listo para ejecutar

**Cómo hacerlo:**

1. Después del deploy, abre esta URL en tu navegador:
   ```
   https://upick-rho.vercel.app/api/superadmin/restaurants/set-default-hours
   ```
2. O usa curl:
   ```bash
   curl -X POST https://upick-rho.vercel.app/api/superadmin/restaurants/set-default-hours
   ```
3. Deberías ver una respuesta JSON con los restaurantes actualizados.

**Horarios configurados:**

- Lunes-Viernes: 08:00 - 20:00
- Sábado: 09:00 - 15:00
- Domingo: Cerrado

---

## ⚙️ 2. Variables de Entorno en Vercel

**Estado:** ⚠️ Requiere acción manual

**Pasos:**

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto `upic` o `upick-rho`
3. Ve a **Settings** → **Environment Variables**
4. Verifica/agrega estas variables:

### Variables Cliente (NEXT*PUBLIC*\*)

```
NEXT_PUBLIC_APP_URL=https://upick-rho.vercel.app
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=prv_test_eo1oEoziexIkUAueF8vZdHN76VaLbRpM
```

### Variables Servidor

```
DATABASE_URL=tu_database_url_de_supabase
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
WOMPI_PRIVATE_KEY=prv_test_eo1oEoziexIkUAueF8vZdHN76VaLbRpM
WOMPI_WEBHOOK_SECRET=test_events_oDUjbkCQzuwUWKm8pfHe1VeqSEG2yL8R
WOMPI_API_URL=https://sandbox.wompi.co/v1
```

**⚠️ IMPORTANTE:**

- `NEXT_PUBLIC_APP_URL` debe ser exactamente `https://upick-rho.vercel.app`
- Después de agregar/modificar variables, haz un **redeploy** del proyecto

---

## 🔗 3. Configurar Webhook de Wompi

**Estado:** ⚠️ Requiere acción manual

**URL del Webhook:**

```
https://upick-rho.vercel.app/api/payments/webhook
```

**Pasos:**

1. Ve a [Wompi Sandbox Panel](https://comercios.wompi.co/)
2. Inicia sesión con tus credenciales
3. Ve a **Configuración** → **Webhooks** (o **Integraciones**)
4. Haz clic en **Agregar Webhook** o **Nuevo Webhook**
5. Completa el formulario:
   - **URL:** `https://upick-rho.vercel.app/api/payments/webhook`
   - **Eventos:** Selecciona `transaction.updated` (obligatorio)
   - **Método:** POST
6. Guarda el webhook

**Verificar que funciona:**

1. Haz un pedido de prueba
2. Completa el pago
3. Ve a los logs de Vercel (Deployments → View Function Logs)
4. Busca logs del webhook recibiendo la notificación

---

## 📋 Checklist Completo

- [ ] **Horarios configurados** - Ejecutar endpoint `/api/superadmin/restaurants/set-default-hours`
- [ ] **NEXT_PUBLIC_APP_URL** configurado en Vercel
- [ ] **Todas las variables de entorno** configuradas en Vercel
- [ ] **Redeploy** después de cambiar variables
- [ ] **Webhook de Wompi** configurado en panel de Wompi
- [ ] **Probar flujo completo** (pedido → pago → validación)

---

## 🧪 4. Probar Flujo Completo

### Como Estudiante:

1. Ve a `https://upick-rho.vercel.app`
2. Selecciona una universidad
3. Selecciona un restaurante
4. Agrega productos al carrito
5. Completa el checkout
6. Realiza el pago con Wompi (tarjeta de prueba)
7. Verifica que recibes el código de recogida

### Como Admin:

1. Ve a `/admin/orders`
2. Verifica que aparece el nuevo pedido
3. Cambia el estado a "En preparación" → "Listo"
4. Usa el escáner QR (`/admin/scan`)
5. Escanea el código del estudiante
6. Valida el pedido

---

## 🆘 Troubleshooting

### El webhook no funciona:

- Verifica que la URL esté correcta
- Revisa los logs de Vercel
- Verifica que `WOMPI_WEBHOOK_SECRET` coincida con el de Wompi

### Los horarios no se configuran:

- Verifica que el endpoint esté accesible
- Revisa los logs de Vercel
- Verifica que haya restaurantes activos en la BD

### Variables de entorno no funcionan:

- Asegúrate de hacer redeploy después de cambiar variables
- Verifica que las variables estén en el ambiente correcto (Production)
- Revisa que no haya espacios extra en los valores

---

## 📝 Notas Finales

- **Modo Sandbox:** Todas las transacciones son de prueba
- **Producción:** Cuando vayas a producción, cambia las keys de Wompi
- **Dominio:** Puedes configurar un dominio personalizado en Vercel después

**¿Listo para continuar con la OPCIÓN C?** 🎯

