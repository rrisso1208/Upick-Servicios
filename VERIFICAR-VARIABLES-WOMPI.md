# 🔍 Verificar Variables de Entorno Wompi en Vercel

## ❌ Error Actual

```
GET /api/payments/integrity-signature 500 (Internal Server Error)
```

Este error indica que falta la variable `WOMPI_INTEGRITY_SECRET` en Vercel.

## ✅ Solución: Configurar Variables en Vercel

### Paso 1: Obtener el Secreto de Integridad

1. Ve al Dashboard de Wompi: https://comercios.wompi.co
2. Inicia sesión con tu cuenta
3. Ve a: **Desarrolladores → Secretos para integración técnica**
4. Copia el valor de **"Secreto de integridad"** (Integrity Secret)

### Paso 2: Agregar Variable en Vercel

1. Ve a tu proyecto en Vercel: https://vercel.com
2. Selecciona el proyecto **upick**
3. Ve a **Settings → Environment Variables**
4. Agrega la siguiente variable:

```
Name: WOMPI_INTEGRITY_SECRET
Value: [Pega aquí el secreto de integridad de Wompi]
Environment: Production, Preview, Development (marca todas)
```

### Paso 3: Verificar Variables Existentes

Asegúrate de que también tengas estas variables configuradas:

- ✅ `NEXT_PUBLIC_WOMPI_PUBLIC_KEY` (debe empezar con `pub_test_` o `pub_prod_`)
- ✅ `WOMPI_PRIVATE_KEY` (debe empezar con `prv_test_` o `prv_prod_`)
- ✅ `WOMPI_WEBHOOK_SECRET` (cualquier string secreto)
- ✅ `WOMPI_INTEGRITY_SECRET` ⚠️ **ESTA ES LA QUE FALTA**

### Paso 4: Redesplegar

Después de agregar las variables:

1. Ve a **Deployments**
2. Haz clic en los **3 puntos** del último deployment
3. Selecciona **Redeploy**
4. Espera a que termine el deploy

### Paso 5: Verificar

Después del redeploy, intenta hacer un pedido nuevamente. El error debería desaparecer.

## 🔧 Verificar en Logs de Vercel

Si el error persiste:

1. Ve a **Deployments → [Último deployment] → Functions**
2. Busca el log de `/api/payments/integrity-signature`
3. Revisa el mensaje de error específico

El error debería mostrar algo como:

```
WOMPI_INTEGRITY_SECRET and WOMPI_WEBHOOK_SECRET are not configured
```

## 📝 Nota Importante

El **Secreto de Integridad** es diferente del **Private Key** y del **Webhook Secret**.
Necesitas los 3 valores diferentes:

- `WOMPI_PRIVATE_KEY`: Para crear transacciones
- `WOMPI_WEBHOOK_SECRET`: Para validar webhooks
- `WOMPI_INTEGRITY_SECRET`: Para generar la firma del widget ⚠️
