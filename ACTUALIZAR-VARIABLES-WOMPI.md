# 🔑 Actualizar Variables de Entorno de Wompi

## Variables Necesarias

Basándote en la captura de pantalla del dashboard de Wompi, necesitas actualizar estas variables:

### 1. **WOMPI_INTEGRITY_SECRET** (NUEVA - CRÍTICA)

Esta es la variable más importante que falta. Debes:

1. En el dashboard de Wompi, ve a: **Desarrolladores → Programadores**
2. En la sección **"Secretos para integración técnica"**
3. Haz clic en **"Ocultar"** junto a **"Integridad"**
4. Copia el valor completo que empieza con `test_integrity_...`
5. Agrega esta variable a tu `.env`:

```env
WOMPI_INTEGRITY_SECRET=test_integrity_sWmi2GG... (valor completo)
```

### 2. **Verificar Variables Existentes**

Asegúrate de que estas variables estén configuradas correctamente:

```env
# Llave pública (debe empezar con pub_test_ o pub_prod_)
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_test_hTtjwS... (valor completo)

# Llave privada (debe empezar con prv_test_ o prv_prod_)
WOMPI_PRIVATE_KEY=prv_test_eo1oE... (valor completo)

# Secreto para webhooks (debe empezar con test_events_ o prod_events_)
WOMPI_WEBHOOK_SECRET=test_events_oDUj... (valor completo)

# URL de la API (sandbox o producción)
WOMPI_API_URL=https://sandbox.wompi.co/v1
```

### 3. **Actualizar en Vercel**

Después de actualizar tu `.env` local, también debes agregar `WOMPI_INTEGRITY_SECRET` en Vercel:

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega `WOMPI_INTEGRITY_SECRET` con el valor completo
4. Haz un nuevo deploy

## 📝 Notas Importantes

- El **secreto de integridad** es diferente de la llave privada y el secreto de eventos
- Es necesario para generar la firma SHA256 que valida las transacciones
- Sin esta variable, el widget de Wompi no funcionará correctamente
- El valor debe mantenerse secreto y nunca compartirse públicamente
