# 📱 Configurar Notificaciones WhatsApp

## ✅ Funcionalidad Implementada

Cuando un administrador de restaurante marca un pedido como "Listo" (ready), el cliente recibirá automáticamente una notificación por WhatsApp con:

- ✅ Confirmación de que su pedido está listo
- 📍 Ubicación del restaurante
- 🔢 Código de recogida
- 📱 Instrucciones para retirar el pedido

## 🎯 Opciones de Integración

El sistema soporta **dos métodos** para enviar WhatsApp:

### **Opción 1: Evolution API (Recomendado)** ⭐

Evolution API es más fácil de configurar y no requiere verificación de Meta.

### **Opción 2: Meta WhatsApp Business API**

API oficial de Meta, requiere verificación de negocio.

---

## 🚀 Configuración con Evolution API (Recomendado)

### Paso 1: Instalar Evolution API

Tienes dos opciones:

#### Opción A: Usar un servicio gestionado (Más fácil)

Servicios que ofrecen Evolution API gestionada:

- [Evolution API Cloud](https://evolution-api.com/) - Servicio gestionado
- [Baileys API](https://baileysapi.com/) - Alternativa similar
- Otros proveedores de Evolution API

#### Opción B: Auto-hospedar (Más control)

1. **Instalar Evolution API:**

   ```bash
   # Opción 1: Docker (Recomendado)
   docker run -d \
     --name evolution-api \
     -p 8080:8080 \
     -e AUTHENTICATION_API_KEY=tu-api-key-secreta \
     -e DATABASE_ENABLED=true \
     -e DATABASE_PROVIDER=postgresql \
     -e DATABASE_CONNECTION_URI=postgresql://user:pass@host:5432/evolution \
     atendai/evolution-api:latest

   # Opción 2: Usar un servicio como Railway, Render, etc.
   ```

2. **Crear una instancia:**

   ```bash
   curl -X POST http://tu-evolution-api.com/instance/create \
     -H "apikey: tu-api-key-secreta" \
     -H "Content-Type: application/json" \
     -d '{
       "instanceName": "upick",
       "token": "tu-token-secreto",
       "qrcode": true
     }'
   ```

3. **Conectar WhatsApp:**
   - Escanea el QR code que te proporciona Evolution API
   - Tu número de WhatsApp quedará conectado

### Paso 2: Agregar Variables de Entorno en Vercel

Ve a **Vercel → Settings → Environment Variables** y agrega:

```env
WHATSAPP_EVOLUTION_API_URL=https://tu-evolution-api.com
WHATSAPP_EVOLUTION_API_KEY=tu-api-key-secreta
WHATSAPP_EVOLUTION_INSTANCE_NAME=upick
```

**Ejemplo:**

```env
WHATSAPP_EVOLUTION_API_URL=https://evolution-api.miempresa.com
WHATSAPP_EVOLUTION_API_KEY=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_EVOLUTION_INSTANCE_NAME=upick
```

### Paso 3: Redesplegar

Después de agregar las variables:

1. Ve a **Deployments**
2. Haz clic en los **3 puntos** del último deployment
3. Selecciona **Redeploy**

---

## 🔧 Configuración con Meta WhatsApp Business API (Alternativa)

Si prefieres usar la API oficial de Meta:

### Paso 1: Crear Cuenta de WhatsApp Business

1. Ve a [Meta for Developers](https://developers.facebook.com/)
2. Crea una cuenta o inicia sesión
3. Crea una nueva aplicación
4. Agrega el producto "WhatsApp"

### Paso 2: Configurar WhatsApp Business API

1. En tu aplicación, ve a **WhatsApp > API Setup**
2. Sigue las instrucciones para:
   - Verificar tu número de teléfono
   - Obtener tu **Phone Number ID**
   - Obtener tu **Temporary Access Token** (o crear un token permanente)

### Paso 3: Agregar Variables de Entorno en Vercel

```env
WHATSAPP_META_TOKEN=tu-token-de-acceso-aqui
WHATSAPP_PHONE_NUMBER_ID=tu-phone-number-id-aqui
```

**Nota:** Si configuras ambas opciones, Evolution API tiene prioridad.

---

## 📝 Formato de Números de Teléfono

El sistema normaliza automáticamente los números de teléfono al formato internacional:

- **Entrada:** `3001234567` → **Salida:** `573001234567`
- **Entrada:** `+57 300 123 4567` → **Salida:** `573001234567`
- **Entrada:** `57 300 123 4567` → **Salida:** `573001234567`

**Importante:** Los usuarios deben registrar su número de teléfono en su perfil para recibir notificaciones.

## 🧪 Probar la Funcionalidad

1. Asegúrate de que un usuario tenga su número de teléfono registrado
2. Crea un pedido y completa el pago
3. Como administrador, cambia el estado del pedido a "Listo"
4. El cliente debería recibir el mensaje de WhatsApp automáticamente

## ⚠️ Notas Importantes

### Evolution API:

- ✅ **Más fácil de configurar** - No requiere verificación de Meta
- ✅ **Funciona inmediatamente** - Solo necesitas escanear QR
- ⚠️ **Requiere servidor** - Debes hospedar Evolution API o usar un servicio gestionado
- ⚠️ **Mantenimiento** - Debes mantener actualizada la API

### Meta WhatsApp Business API:

- ✅ **Oficial y estable** - Soporte oficial de Meta
- ✅ **Sin servidor propio** - Usa la infraestructura de Meta
- ⚠️ **Proceso de verificación** - Requiere verificar tu negocio
- ⚠️ **Modo Sandbox** - En desarrollo solo funciona con números verificados
- ⚠️ **Costo** - Tiene costo por mensaje después del período gratuito

### Sin teléfono:

Si el cliente no tiene número registrado, la notificación se omite silenciosamente (se registra en logs).

## 🔍 Verificar Logs

Si las notificaciones no funcionan, revisa los logs en Vercel:

- Busca mensajes que contengan "WhatsApp" o "Evolution API"
- Verifica errores de autenticación o formato de teléfono
- Asegúrate de que las variables de entorno estén configuradas correctamente

## 📚 Documentación Adicional

- [Evolution API Documentation](https://doc.evolution-api.com/)
- [Evolution API GitHub](https://github.com/EvolutionAPI/evolution-api)
- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [Meta for Developers](https://developers.facebook.com/)

## 🆘 Solución de Problemas

### Error: "Evolution API error: 401"

- Verifica que `WHATSAPP_EVOLUTION_API_KEY` sea correcto
- Asegúrate de que la instancia esté creada y activa

### Error: "Evolution API error: 404"

- Verifica que `WHATSAPP_EVOLUTION_API_URL` sea correcto
- Verifica que `WHATSAPP_EVOLUTION_INSTANCE_NAME` coincida con el nombre de tu instancia

### Error: "WhatsApp not configured"

- Verifica que al menos una de las opciones esté configurada
- Evolution API tiene prioridad sobre Meta API

### Mensajes no se envían

- Verifica que el número de teléfono del usuario esté en formato correcto
- Revisa los logs para ver el error específico
- Asegúrate de que la instancia de Evolution API esté conectada (QR escaneado)
