# 🔑 Actualizar Variables de Entorno de Wompi

## Variable Crítica: WOMPI_INTEGRITY_SECRET

Agrega esta variable a tu archivo `.env`:

```env
WOMPI_INTEGRITY_SECRET=test_integrity_sWmi2GGKrlcKnj8m0gXiE24a8FIZySCP
```

## También Actualizar en Vercel

1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Settings** → **Environment Variables**
4. Agrega la variable:
   - **Name:** `WOMPI_INTEGRITY_SECRET`
   - **Value:** `test_integrity_sWmi2GGKrlcKnj8m0gXiE24a8FIZySCP`
   - **Environment:** Production, Preview, Development (selecciona todos)
5. Guarda y haz un nuevo deploy

## Verificar Otras Variables

Asegúrate de que estas variables también estén configuradas:

```env
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_test_... (tu llave pública)
WOMPI_PRIVATE_KEY=prv_test_... (tu llave privada)
WOMPI_WEBHOOK_SECRET=test_events_... (tu secreto de eventos)
WOMPI_API_URL=https://sandbox.wompi.co/v1
```

## Nota Importante

- El secreto de integridad es diferente de la llave privada y el secreto de eventos
- Es necesario para generar la firma SHA256 que valida las transacciones con el widget de Wompi
- Sin esta variable, el widget no funcionará correctamente
