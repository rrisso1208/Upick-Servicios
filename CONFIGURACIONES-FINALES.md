# Configuraciones Finales - U.Pick

Este documento contiene las instrucciones para completar las configuraciones finales del proyecto.

## 1. Configurar Horarios por Defecto para Restaurantes

### Opción A: Usar la API (Recomendado)

Una vez desplegado, llama a esta URL desde tu navegador o con curl:

```bash
curl -X POST https://upick-rho.vercel.app/api/superadmin/restaurants/set-default-hours
```

O desde el navegador:

```
https://upick-rho.vercel.app/api/superadmin/restaurants/set-default-hours
```

**Horarios por defecto configurados:**

- Lunes a Viernes: 08:00 - 20:00
- Sábado: 09:00 - 15:00
- Domingo: Cerrado

### Opción B: Desde el Panel Superadmin

Puedes agregar un botón en el panel superadmin para ejecutar esta acción.

---

## 2. Variables de Entorno en Vercel

Ve a tu proyecto en Vercel → Settings → Environment Variables y verifica/actualiza:

### Variables Requeridas:

#### Cliente (NEXT*PUBLIC*\*)

```
NEXT_PUBLIC_APP_URL=https://upick-rho.vercel.app
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=prv_test_eo1oEoziexIkUAueF8vZdHN76VaLbRpM
```

#### Servidor

```
DATABASE_URL=tu_database_url_de_supabase
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
WOMPI_PRIVATE_KEY=prv_test_eo1oEoziexIkUAueF8vZdHN76VaLbRpM
WOMPI_WEBHOOK_SECRET=test_events_oDUjbkCQzuwUWKm8pfHe1VeqSEG2yL8R
WOMPI_API_URL=https://sandbox.wompi.co/v1
```

**Nota:** `WOMPI_WEBHOOK_SECRET` es el mismo valor que `WOMPI_EVENTS_KEY` en Wompi. Se usa para verificar la firma del webhook.

**⚠️ IMPORTANTE:**

- Asegúrate de que `NEXT_PUBLIC_APP_URL` esté configurado correctamente
- Las keys de Wompi son de **SANDBOX** (modo prueba)
- No compartas las keys de producción públicamente

---

## 3. Configurar Webhook de Wompi

### Paso 1: Obtener la URL del Webhook

Tu webhook URL es:

```
https://upick-rho.vercel.app/api/payments/webhook
```

### Paso 2: Configurar en Wompi

1. Ve a tu panel de Wompi (Sandbox): https://comercios.wompi.co/
2. Inicia sesión con tus credenciales
3. Ve a **Configuración** → **Webhooks**
4. Haz clic en **Agregar Webhook**
5. Ingresa la URL: `https://upick-rho.vercel.app/api/payments/webhook`
6. Selecciona los eventos que quieres recibir:
   - ✅ `transaction.updated` (obligatorio)
   - ✅ `payment.method.updated` (opcional)
7. Guarda el webhook

### Paso 3: Verificar que el Webhook Funciona

El webhook debe:

- Recibir notificaciones de Wompi cuando cambia el estado de un pago
- Validar la firma usando `WOMPI_INTEGRITY_KEY`
- Actualizar el estado del pedido en la base de datos

**Para probar:**

1. Haz un pedido de prueba
2. Completa el pago en Wompi
3. Verifica en los logs de Vercel que el webhook recibió la notificación
4. Verifica que el pedido cambió de estado a "paid"

---

## 4. Verificar Configuración Completa

### Checklist:

- [ ] Horarios configurados para todos los restaurantes
- [ ] `NEXT_PUBLIC_APP_URL` configurado en Vercel
- [ ] Todas las variables de entorno configuradas
- [ ] Webhook de Wompi configurado y funcionando
- [ ] Probar flujo completo: pedido → pago → notificación → validación QR

---

## 5. Probar Flujo Completo

### Como Estudiante:

1. Selecciona una universidad
2. Selecciona un restaurante
3. Agrega productos al carrito
4. Completa el checkout
5. Realiza el pago con Wompi (tarjeta de prueba)
6. Verifica que recibes el código de recogida

### Como Admin:

1. Ve al panel de admin (`/admin/orders`)
2. Verifica que aparece el nuevo pedido
3. Cambia el estado a "En preparación" → "Listo"
4. Usa el escáner QR (`/admin/scan`)
5. Escanea el código del estudiante
6. Valida el pedido

---

## 6. Notas Importantes

### Modo Sandbox de Wompi

- Las transacciones NO son reales
- Usa tarjetas de prueba de Wompi
- No se cobrará dinero real

### Cuando vayas a Producción:

1. Cambia las keys de Wompi de `test_*` a las de producción
2. Actualiza el webhook con la URL de producción
3. Configura el dominio personalizado en Vercel
4. Actualiza `NEXT_PUBLIC_APP_URL` con tu dominio

---

## Soporte

Si tienes problemas:

1. Revisa los logs de Vercel
2. Verifica las variables de entorno
3. Prueba el webhook con curl o Postman
4. Revisa la documentación de Wompi: https://docs.wompi.co/
