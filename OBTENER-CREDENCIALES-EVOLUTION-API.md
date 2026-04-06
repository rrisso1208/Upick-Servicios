# 🔑 Cómo Obtener Credenciales de Evolution API

## 📍 Información que Necesitas del Dashboard

Basándote en tu dashboard de Evolution API, necesitas obtener **3 valores**:

### 1. **WHATSAPP_EVOLUTION_API_URL** 🌐

**URL base de tu Evolution API**

De la URL que ves en el navegador:

```
whatsapp-evolution-api.op8dyj.easypanel.host
```

**Convierte a URL completa:**

```
https://whatsapp-evolution-api.op8dyj.easypanel.host
```

**O si tienes un dominio personalizado:**

```
https://evolution-api.tudominio.com
```

**⚠️ IMPORTANTE:**

- Debe empezar con `https://` (o `http://` solo si es local)
- No incluyas `/manager` ni rutas adicionales
- Solo la URL base del servidor

---

### 2. **WHATSAPP_EVOLUTION_API_KEY** 🔐

**API Key de autenticación**

Esta la encuentras en:

#### Opción A: En el Dashboard de Evolution API

1. Ve a **Configurations** (en el menú lateral)
2. Busca la sección **"API Key"** o **"Authentication"**
3. Copia el valor (será algo como: `EAAxxxxxxxxxxxxx` o un token largo)

#### Opción B: En Easypanel (si usas Easypanel)

1. Ve a tu proyecto en Easypanel
2. Busca la variable de entorno `AUTHENTICATION_API_KEY`
3. Copia ese valor

#### Opción C: Si no la encuentras

Puedes crear una nueva o usar la que configuraste al crear la instancia.

**Ejemplo de cómo se ve:**

```
EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

o

```
mi-api-key-super-secreta-123456
```

---

### 3. **WHATSAPP_EVOLUTION_INSTANCE_NAME** 📱

**Nombre de tu instancia**

De tu dashboard, veo que tu instancia se llama:

```
Gibra
```

**Este es el valor que necesitas.**

**⚠️ IMPORTANTE:**

- Debe ser exactamente como aparece en el dashboard
- Es case-sensitive (mayúsculas/minúsculas importan)
- Si tu instancia se llama "Gibra", usa exactamente "Gibra"

---

## 📋 Resumen de Valores para Vercel

Una vez que tengas los 3 valores, agrégalos en **Vercel → Settings → Environment Variables**:

```env
WHATSAPP_EVOLUTION_API_URL=https://whatsapp-evolution-api.op8dyj.easypanel.host
WHATSAPP_EVOLUTION_API_KEY=tu-api-key-aqui
WHATSAPP_EVOLUTION_INSTANCE_NAME=Gibra
```

**Ejemplo completo:**

```env
WHATSAPP_EVOLUTION_API_URL=https://whatsapp-evolution-api.op8dyj.easypanel.host
WHATSAPP_EVOLUTION_API_KEY=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_EVOLUTION_INSTANCE_NAME=Gibra
```

---

## 🔍 Dónde Buscar Cada Valor

### ✅ **URL (WHATSAPP_EVOLUTION_API_URL):**

- Mira la barra de direcciones del navegador
- Quita `/manager/instance/...` y todo lo que viene después
- Solo deja la parte base: `https://whatsapp-evolution-api.op8dyj.easypanel.host`

### ✅ **API Key (WHATSAPP_EVOLUTION_API_KEY):**

- Menú lateral → **Configurations**
- O en Easypanel → Variables de entorno → `AUTHENTICATION_API_KEY`
- O en la documentación de tu servicio de Evolution API

### ✅ **Instance Name (WHATSAPP_EVOLUTION_INSTANCE_NAME):**

- En el título del dashboard: **"Gibra"**
- O en la lista de instancias
- Es el nombre que diste cuando creaste la instancia

---

## 🧪 Verificar que Funciona

Después de configurar las variables en Vercel y redesplegar, puedes probar con:

```bash
curl -X POST https://whatsapp-evolution-api.op8dyj.easypanel.host/message/sendText/Gibra \
  -H "apikey: tu-api-key-aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "573001234567",
    "text": "Mensaje de prueba"
  }'
```

Si funciona, deberías recibir un mensaje en WhatsApp.

---

## ⚠️ Notas Importantes

1. **Estado "Connected":** ✅ Tu instancia está conectada y lista para usar
2. **Número de WhatsApp:** `573209891782@s.whatsapp.net` - Este es el número desde el cual se enviarán los mensajes
3. **Seguridad:** Nunca compartas tu API Key públicamente
4. **HTTPS:** Asegúrate de usar `https://` en producción

---

## 🆘 Si No Encuentras la API Key

Si no puedes encontrar la API Key en el dashboard:

1. **Revisa la documentación** de tu proveedor de Evolution API
2. **Contacta soporte** de Easypanel o tu servicio
3. **Revisa las variables de entorno** del contenedor/servicio donde está corriendo Evolution API
4. **Crea una nueva API Key** si tu servicio lo permite

---

## ✅ Checklist

- [ ] Tengo la URL base de Evolution API
- [ ] Tengo la API Key
- [ ] Tengo el nombre de la instancia (Gibra)
- [ ] Agregué las 3 variables en Vercel
- [ ] Redesplegué la aplicación en Vercel
- [ ] Probé enviar un mensaje de prueba
