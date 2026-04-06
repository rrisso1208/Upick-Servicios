# 🔐 Configurar WOMPI_INTEGRITY_SECRET en Vercel

## ⚠️ Error Actual

Estás recibiendo un error 500 porque falta la variable `WOMPI_INTEGRITY_SECRET` en Vercel.

```
GET /api/payments/integrity-signature 500 (Internal Server Error)
Error: WOMPI_INTEGRITY_SECRET no está configurado
```

## 📋 Pasos para Solucionarlo

### 1. Obtener el Secreto de Integridad de Wompi

1. **Inicia sesión en tu cuenta de Wompi:**
   - Ve a [comercios.wompi.co](https://comercios.wompi.co)
   - Inicia sesión con tus credenciales

2. **Navega a la sección de Desarrolladores:**
   - En el menú lateral, busca **"Desarrolladores"** o **"Desarrollo"**
   - O ve directamente a la sección de **"Secretos para integración técnica"**

3. **Encuentra el Secreto de Integridad:**
   - Busca una llave que tenga el prefijo:
     - **Sandbox:** `test_integrity_...`
     - **Producción:** `prod_integrity_...`
   - Copia el valor completo (es una cadena larga de caracteres)

### 2. Agregar la Variable en Vercel

1. **Ve a tu proyecto en Vercel:**
   - Abre [vercel.com](https://vercel.com)
   - Selecciona tu proyecto `upick-xi`

2. **Accede a Settings → Environment Variables:**
   - Haz clic en **Settings**
   - En el menú lateral, selecciona **Environment Variables**

3. **Agrega la nueva variable:**
   - **Nombre:** `WOMPI_INTEGRITY_SECRET`
   - **Valor:** Pega el secreto de integridad que copiaste de Wompi
   - **Environment:** Selecciona:
     - ✅ Production
     - ✅ Preview
     - ✅ Development (opcional)

4. **Guarda los cambios:**
   - Haz clic en **Save**
   - Espera a que se guarde la variable

### 3. Redesplegar la Aplicación

**IMPORTANTE:** Después de agregar la variable, debes redesplegar:

1. **Opción A - Redesplegar manualmente:**
   - Ve a la pestaña **Deployments**
   - Encuentra el último deployment
   - Haz clic en los **3 puntos** (⋯) → **Redeploy**

2. **Opción B - Hacer un nuevo commit:**
   - Haz cualquier cambio pequeño (o simplemente un commit vacío)
   - Push a GitHub
   - Vercel desplegará automáticamente con las nuevas variables

## ✅ Verificar que Funciona

Después de redesplegar, intenta hacer un pedido nuevamente. El error debería desaparecer y el widget de Wompi debería abrirse correctamente.

## 🔍 Variables de Wompi Requeridas

Asegúrate de tener estas variables configuradas en Vercel:

| Variable                       | Descripción                                  | Dónde Obtenerla                              |
| ------------------------------ | -------------------------------------------- | -------------------------------------------- |
| `WOMPI_INTEGRITY_SECRET`       | Secreto para firmar transacciones del widget | Dashboard Wompi → Desarrolladores → Secretos |
| `WOMPI_PRIVATE_KEY`            | Llave privada para API                       | Dashboard Wompi → Desarrolladores → Llaves   |
| `WOMPI_WEBHOOK_SECRET`         | Secreto para validar webhooks                | Dashboard Wompi → Desarrolladores → Webhooks |
| `NEXT_PUBLIC_WOMPI_PUBLIC_KEY` | Llave pública (visible en cliente)           | Dashboard Wompi → Desarrolladores → Llaves   |

## 📝 Notas Importantes

- **Sandbox vs Producción:** Asegúrate de usar las llaves correctas según el ambiente:
  - **Sandbox:** Prefijos `test_` o `pub_test_` / `prv_test_`
  - **Producción:** Prefijos `prod_` o `pub_prod_` / `prv_prod_`

- **Seguridad:** El `WOMPI_INTEGRITY_SECRET` es **sensible** y debe mantenerse secreto. Nunca lo compartas públicamente.

- **Formato:** El secreto de integridad es una cadena larga sin espacios. Asegúrate de copiarlo completo.

## 🆘 Si Sigue Sin Funcionar

1. **Verifica los logs de Vercel:**
   - Ve a **Deployments** → Último deployment → **Functions** → `/api/payments/integrity-signature`
   - Revisa los logs para ver qué variable falta exactamente

2. **Verifica que la variable esté en el ambiente correcto:**
   - Asegúrate de que `WOMPI_INTEGRITY_SECRET` esté marcada para **Production**

3. **Contacta soporte:**
   - Si después de seguir estos pasos sigue fallando, revisa los logs y comparte el error específico
