# 🚀 Configurar Evolution API para WhatsApp

## ¿Qué es Evolution API?

Evolution API es una solución **open source** que permite usar WhatsApp sin necesidad de pasar por el proceso de verificación de Meta. Es **mucho más fácil** de configurar que la API oficial.

## ✅ Ventajas

- ✅ **Más fácil de configurar** - Solo necesitas escanear un QR
- ✅ **Sin verificación de negocio** - Funciona inmediatamente
- ✅ **Open source y gratuito** - No hay costos ocultos
- ✅ **Más flexible** - Puedes personalizar completamente

## 📋 Opciones de Instalación

### Opción 1: Servicio Gestionado (Más Fácil) ⭐

Hay servicios que ofrecen Evolution API ya configurada:

- **[Evolution API Cloud](https://evolution-api.com/)** - Servicio oficial gestionado
- **[Baileys API](https://baileysapi.com/)** - Alternativa similar
- Otros proveedores de Evolution API

**Pasos:**

1. Regístrate en el servicio
2. Crea una instancia
3. Escanea el QR con tu WhatsApp
4. Obtén la URL y API Key
5. Configura las variables en Vercel (ver abajo)

### Opción 2: Auto-hospedar con Docker (Más Control)

#### Requisitos:

- Servidor con Docker instalado
- PostgreSQL (opcional, para persistencia)

#### Instalación Rápida:

```bash
# 1. Crear directorio
mkdir evolution-api
cd evolution-api

# 2. Crear archivo docker-compose.yml
cat > docker-compose.yml << EOF
version: '3.8'

services:
  evolution-api:
    image: atendai/evolution-api:latest
    container_name: evolution-api
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - AUTHENTICATION_API_KEY=tu-api-key-super-secreta-aqui
      - DATABASE_ENABLED=true
      - DATABASE_PROVIDER=postgresql
      - DATABASE_CONNECTION_URI=postgresql://user:password@host:5432/evolution
      - CONFIG_SESSION_PHONE_CLIENT=Chrome
      - CONFIG_SESSION_PHONE_NAME=Evolution API
    volumes:
      - evolution_instances:/evolution/instances
      - evolution_store:/evolution/store

volumes:
  evolution_instances:
  evolution_store:
EOF

# 3. Iniciar Evolution API
docker-compose up -d

# 4. Ver logs
docker-compose logs -f
```

#### Crear Instancia:

```bash
# Crear una instancia llamada "upick"
curl -X POST http://localhost:8080/instance/create \
  -H "apikey: tu-api-key-super-secreta-aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "upick",
    "token": "tu-token-secreto-opcional",
    "qrcode": true
  }'
```

#### Conectar WhatsApp:

1. Obtén el QR code:

   ```bash
   curl http://localhost:8080/instance/connect/upick \
     -H "apikey: tu-api-key-super-secreta-aqui"
   ```

2. Escanea el QR con tu WhatsApp (WhatsApp > Dispositivos vinculados)

3. Verifica el estado:
   ```bash
   curl http://localhost:8080/instance/fetchInstances \
     -H "apikey: tu-api-key-super-secreta-aqui"
   ```

### Opción 3: Usar Railway/Render/Fly.io (Recomendado para Producción)

Estos servicios hacen el deploy automáticamente:

#### Railway:

1. Ve a [Railway](https://railway.app/)
2. Crea nuevo proyecto
3. Conecta el repositorio de Evolution API o usa el template
4. Configura las variables de entorno
5. Deploy automático

#### Render:

1. Ve a [Render](https://render.com/)
2. Crea nuevo Web Service
3. Usa la imagen Docker: `atendai/evolution-api:latest`
4. Configura variables de entorno
5. Deploy

## 🔧 Configurar en Vercel

Una vez que tengas Evolution API funcionando:

### Paso 1: Obtener Credenciales

- **URL:** `https://tu-evolution-api.com` (o `http://localhost:8080` si es local)
- **API Key:** La que configuraste en `AUTHENTICATION_API_KEY`
- **Instance Name:** El nombre que diste a tu instancia (ej: `upick`)

### Paso 2: Agregar Variables en Vercel

Ve a **Vercel → Settings → Environment Variables** y agrega:

```env
WHATSAPP_EVOLUTION_API_URL=https://tu-evolution-api.com
WHATSAPP_EVOLUTION_API_KEY=tu-api-key-super-secreta-aqui
WHATSAPP_EVOLUTION_INSTANCE_NAME=upick
```

**Ejemplo con servicio gestionado:**

```env
WHATSAPP_EVOLUTION_API_URL=https://api.evolution-api.com
WHATSAPP_EVOLUTION_API_KEY=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_EVOLUTION_INSTANCE_NAME=upick
```

**Ejemplo con servidor propio:**

```env
WHATSAPP_EVOLUTION_API_URL=https://evolution-api.miempresa.com
WHATSAPP_EVOLUTION_API_KEY=mi-api-key-super-secreta
WHATSAPP_EVOLUTION_INSTANCE_NAME=upick
```

### Paso 3: Redesplegar

1. Ve a **Deployments**
2. Haz clic en los **3 puntos** del último deployment
3. Selecciona **Redeploy**

## 🧪 Probar

### Probar envío de mensaje:

```bash
curl -X POST https://tu-evolution-api.com/message/sendText/upick \
  -H "apikey: tu-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "573001234567",
    "text": "Mensaje de prueba"
  }'
```

### Verificar estado de instancia:

```bash
curl https://tu-evolution-api.com/instance/fetchInstances \
  -H "apikey: tu-api-key"
```

## ⚠️ Notas Importantes

### Seguridad:

- 🔒 **Nunca compartas tu API Key** públicamente
- 🔒 Usa HTTPS en producción
- 🔒 Configura firewall para limitar acceso

### Mantenimiento:

- 📦 Actualiza Evolution API regularmente
- 📦 Monitorea los logs
- 📦 Haz backup de las instancias

### Limitaciones:

- ⚠️ Si desconectas WhatsApp, debes volver a escanear el QR
- ⚠️ WhatsApp puede limitar mensajes si envías spam
- ⚠️ No uses para spam o mensajes masivos no solicitados

## 🔍 Solución de Problemas

### Error: "Instance not found"

- Verifica que el nombre de la instancia sea correcto
- Asegúrate de que la instancia esté creada y conectada

### Error: "Unauthorized"

- Verifica que el API Key sea correcto
- Asegúrate de incluir el header `apikey` en las peticiones

### Error: "Connection closed"

- La instancia se desconectó, escanea el QR nuevamente
- Verifica que el contenedor de Evolution API esté corriendo

### Mensajes no se envían

- Verifica que la instancia esté conectada (QR escaneado)
- Revisa los logs de Evolution API
- Verifica el formato del número de teléfono

## 📚 Recursos

- [Evolution API GitHub](https://github.com/EvolutionAPI/evolution-api)
- [Evolution API Documentation](https://doc.evolution-api.com/)
- [Docker Hub - Evolution API](https://hub.docker.com/r/atendai/evolution-api)

## 💡 Tips

1. **Para desarrollo:** Usa ngrok para exponer tu Evolution API local:

   ```bash
   ngrok http 8080
   # Usa la URL de ngrok en WHATSAPP_EVOLUTION_API_URL
   ```

2. **Para producción:** Usa un servicio gestionado o un VPS con dominio propio

3. **Backup:** Guarda el QR o configuración de la instancia por si necesitas reconectar

4. **Monitoreo:** Configura alertas para cuando la instancia se desconecte
