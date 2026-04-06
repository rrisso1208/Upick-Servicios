# Integración POS (Point of Sale) - UPIC

Este documento describe el sistema de integración con APIs de POS (Point of Sale) implementado en UPIC para restaurantes en Colombia.

## 🇨🇴 POS Priorizados para Colombia

Este sistema está diseñado específicamente para los principales sistemas POS utilizados en restaurantes, gastrobares y cadenas de comida en Colombia:

1. **Vendty POS** - Muy popular en restaurantes y gastrobares
2. **Siigo POS** - Facturación y POS con integración DIAN
3. **SoftRestaurant** - Gestión integral para restaurantes
4. **Loggro POS Restobar** - Especializado para restaurantes y bares
5. **Loyverse POS** - Gratuito, popular en restaurantes pequeños/medianos
6. **Toteat / Fudo POS** - Sistema de punto de venta
7. **POS Genérico** - Para cualquier POS futuro con API REST

## 📋 Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Arquitectura](#arquitectura)
3. [Conectores POS Soportados](#conectores-pos-soportados)
4. [Configuración](#configuración)
5. [Flujo de Integración](#flujo-de-integración)
6. [Esquema de Datos](#esquema-de-datos)
7. [API Endpoints](#api-endpoints)
8. [Desarrollo y Extensión](#desarrollo-y-extensión)

## 🎯 Descripción General

El sistema de integración POS permite a los restaurantes enviar automáticamente los pedidos recibidos en UPIC a su sistema de punto de venta (POS). Esto elimina la necesidad de ingresar manualmente los pedidos en el POS y mejora la eficiencia operativa.

### Características Principales

- ✅ **Integración Automática**: Los pedidos se envían automáticamente al POS cuando se confirma el pago
- ✅ **Múltiples POS Soportados**: Conectores para los principales sistemas POS en Colombia
- ✅ **Test de Conexión**: Interfaz para probar la conexión antes de activar
- ✅ **Manejo de Errores**: Reintentos automáticos y logging de errores
- ✅ **Modular y Extensible**: Fácil agregar nuevos conectores POS

## 🏗️ Arquitectura

```
┌─────────────────┐
│   Cliente UPIC  │
│  (Realiza pedido)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API de Pedidos  │
│  (/api/orders)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Webhook Wompi  │
│ (Pago aprobado) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  posService.ts  │
│  (Orquestador)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Conector POS   │
│  (Específico)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   API del POS   │
│  (Externa)      │
└─────────────────┘
```

### Componentes Principales

1. **Esquema UPIC Order** (`src/lib/pos/types.ts`)
   - Formato interno estándar de pedidos
   - Transformación desde el modelo de base de datos

2. **Conectores POS** (`src/lib/pos/connectors/`)
   - Clase base abstracta (`base.ts`)
   - Implementaciones específicas por POS
   - Manejo de autenticación y transformación de datos

3. **Servicio Orquestador** (`src/lib/pos/posService.ts`)
   - Identifica qué POS usa cada restaurante
   - Transforma pedidos al formato estándar
   - Envía al conector correspondiente
   - Maneja logs y reintentos

4. **API Endpoints** (`src/app/api/admin/restaurant/pos/`)
   - Test de conexión
   - Configuración POS

5. **UI de Configuración** (`src/app/admin/settings/page.tsx`)
   - Interfaz para configurar POS
   - Test de conexión visual

## 🔌 Conectores POS Soportados (Priorizados para Colombia)

### 1. Vendty POS ⭐

- **Archivo**: `src/lib/pos/connectors/vendty.ts`
- **Endpoint de Test**: `/api/v1/health`
- **Endpoint de Pedidos**: `/api/v1/orders`
- **Autenticación**: Bearer Token (API Key)
- **Descripción**: Uno de los POS más populares en restaurantes y gastrobares colombianos
- **Documentación**: https://docs.vendty.com (verificar URL real)

### 2. Siigo POS ⭐

- **Archivo**: `src/lib/pos/connectors/siigo.ts`
- **Endpoint de Test**: `/api/v1/auth/validate`
- **Endpoint de Pedidos**: `/api/v1/sales`
- **Autenticación**: Bearer Token (OAuth 2.0)
- **Descripción**: Sistema de facturación y POS con integración DIAN para cumplimiento normativo
- **Documentación**: https://siigoapi.azure-api.net (verificar URL real)
- **Nota**: Puede requerir formato de factura electrónica según normativa DIAN

### 3. SoftRestaurant

- **Archivo**: `src/lib/pos/connectors/softrestaurant.ts`
- **Endpoint de Test**: `/api/v1/health`
- **Endpoint de Pedidos**: `/api/v1/orders`
- **Autenticación**: API Token
- **Descripción**: Sistema de gestión integral para restaurantes en Colombia

### 4. Loggro POS Restobar

- **Archivo**: `src/lib/pos/connectors/loggro.ts`
- **Endpoint de Test**: `/api/v1/connection-test`
- **Endpoint de Pedidos**: `/api/v1/orders`
- **Autenticación**: API Key o Bearer Token
- **Descripción**: Sistema POS especializado para restaurantes y bares

### 5. Loyverse POS ⭐

- **Archivo**: `src/lib/pos/connectors/loyverse.ts`
- **Endpoint de Test**: `/v1/stores`
- **Endpoint de Pedidos**: `/v1/receipts`
- **Autenticación**: Bearer Token (Access Token)
- **Base URL**: `https://api.loyverse.com`
- **Descripción**: Sistema POS gratuito muy popular en restaurantes pequeños y medianos
- **Documentación**: https://developer.loyverse.com/docs
- **Nota**: API oficial documentada, lista para usar con credenciales reales

### 6. Toteat / Fudo POS

- **Archivo**: `src/lib/pos/connectors/toteat.ts`
- **Endpoint de Test**: `/api/v1/test-connection`
- **Endpoint de Pedidos**: `/api/v1/orders`
- **Autenticación**: API Key
- **Descripción**: Sistema de punto de venta para restaurantes

### 7. POS Genérico (RestaurantePOS)

- **Archivo**: `src/lib/pos/connectors/restaurantepos.ts`
- **Configurable**: Endpoints y formato personalizables
- **Uso**: Para APIs REST estándar o futuras integraciones
- **Descripción**: Conector genérico para cualquier POS con API REST estándar

## ⚙️ Configuración

### 1. Migración de Base de Datos

Ejecutar la migración SQL para agregar campos POS al modelo Restaurant:

```bash
psql -d tu_database -f migration_add_pos_fields.sql
```

O ejecutar directamente en la base de datos:

```sql
-- Ver migration_add_pos_fields.sql para el SQL completo
```

### 2. Configurar POS en el Panel Admin

1. Ir a **Configuración** en el panel de administración del restaurante
2. En la sección **Integración POS**:
   - Activar "Habilitar integración POS"
   - Seleccionar el tipo de POS
   - Ingresar credenciales (API Key/Token, URL Base, etc.)
   - Hacer clic en **Probar Conexión**
   - Si la conexión es exitosa, guardar la configuración

### 3. Credenciales por Tipo de POS

#### Vendty POS

- **API Key**: Bearer Token requerido
- **URL Base**: Opcional (por defecto endpoints relativos)
- **Restaurant ID**: Opcional

#### Siigo POS

- **API Token**: Bearer Token (OAuth 2.0 Access Token)
- **URL Base**: Opcional
- **Restaurant ID**: Opcional
- **Nota**: Puede requerir configuración adicional para facturación electrónica DIAN

#### SoftRestaurant

- **API Token**: Token de autenticación
- **URL Base**: Opcional
- **Restaurant ID**: Opcional

#### Loggro POS

- **API Key**: API Key o Bearer Token
- **URL Base**: Opcional
- **Restaurant ID**: Opcional

#### Loyverse POS

- **Access Token**: Bearer Token (obtenido de https://developer.loyverse.com)
- **URL Base**: `https://api.loyverse.com` (configurado automáticamente)
- **Store ID**: Requerido (ID de la tienda en Loyverse)
- **Documentación**: https://developer.loyverse.com/docs

#### Toteat / Fudo POS

- **API Key**: API Key
- **URL Base**: Opcional
- **Restaurant ID**: Opcional

#### POS Genérico

- **API Key/Token**: Configurable
- **URL Base**: Configurable
- **Endpoints**: Configurables en credenciales

## 🔄 Flujo de Integración

### Flujo Completo

```
1. Cliente realiza pedido en UPIC
   ↓
2. Pedido se crea con status "awaiting_payment"
   ↓
3. Cliente realiza pago (Wompi)
   ↓
4. Webhook de Wompi confirma pago aprobado
   ↓
5. Sistema actualiza pedido a status "paid"
   ↓
6. posService verifica si el restaurante tiene POS configurado
   ↓
7. Si está configurado y habilitado:
   - Transforma pedido al formato UPICOrder
   - Identifica el tipo de POS
   - Crea instancia del conector correspondiente
   - Envía pedido al POS
   - Registra resultado (éxito o error)
   ↓
7. Si falla pero es recuperable:
   - Guarda para reintento posterior
   ↓
8. Continúa con notificaciones (email, WhatsApp)
```

### Diagrama de Secuencia

```
Cliente          UPIC API        Webhook        posService      Conector      POS API
  │                 │               │               │              │              │
  │── Pedido ──────>│               │               │              │              │
  │                 │── Crear ─────>│               │              │              │
  │                 │<── OK ────────│               │              │              │
  │                 │               │               │              │              │
  │── Pago ────────>│               │              │              │              │
  │                 │               │              │              │              │
  │                 │               │── Aprobado ──>│              │              │
  │                 │               │              │              │              │
  │                 │               │              │── Verificar ─>│              │
  │                 │               │              │<── Config ────│              │
  │                 │               │              │              │              │
  │                 │               │              │── Enviar ─────>│              │
  │                 │               │              │              │── POST ──────>│
  │                 │               │              │              │<── OK ────────│
  │                 │               │              │<── Result ────│              │
  │                 │               │              │              │              │
  │<── Notificación─│               │              │              │              │
```

## 📊 Esquema de Datos

### UPIC Order Schema

```typescript
interface UPICOrder {
  orderId: string;
  items: Array<{
    name: string;
    qty: number;
    price: number; // En centavos
    notes?: string;
    options?: Array<{
      name: string;
      price: number;
    }>;
  }>;
  table?: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  payment: {
    method: string;
    status: string;
    transactionId?: string;
  };
  notes?: string;
  restaurantId: string;
  restaurantName: string;
  totalAmount: number; // En centavos
  createdAt: string; // ISO string
  pickupCode?: string;
  serviceMode?: 'TAKEOUT' | 'EAT_IN' | 'DELIVERY';
}
```

### Campos en Base de Datos (Restaurant)

```sql
posType TEXT              -- Tipo de POS
posEnabled BOOLEAN        -- Si está habilitado
posCredentials JSONB      -- Credenciales (API keys, tokens, etc.)
posLastTestAt TIMESTAMP  -- Último test de conexión
posLastTestResult JSONB  -- Resultado del último test
```

## 🔌 API Endpoints

### Test de Conexión

**POST** `/api/admin/restaurant/pos/test-connection`

Prueba la conexión con el POS configurado.

**Response:**

```json
{
  "success": true,
  "message": "Conexión exitosa con Toteat POS",
  "data": {}
}
```

### Obtener Configuración

**GET** `/api/admin/restaurant/pos/config`

Obtiene la configuración POS actual del restaurante.

**Response:**

```json
{
  "success": true,
  "data": {
    "posType": "toteat",
    "posEnabled": true,
    "posCredentials": {
      "apiKey": "***",
      "baseUrl": "https://api.toteat.com"
    },
    "lastTestAt": "2024-01-15T10:30:00Z",
    "lastTestResult": {
      "success": true,
      "message": "Conexión exitosa"
    }
  }
}
```

### Actualizar Configuración

**PATCH** `/api/admin/restaurant/pos/config`

Actualiza la configuración POS del restaurante.

**Body:**

```json
{
  "posType": "toteat",
  "posEnabled": true,
  "posCredentials": {
    "apiKey": "tu-api-key",
    "baseUrl": "https://api.toteat.com",
    "restaurantId": "rest-123"
  }
}
```

## 🛠️ Desarrollo y Extensión

### Agregar un Nuevo Conector POS

1. **Crear archivo del conector** en `src/lib/pos/connectors/`

```typescript
import { BasePOSConnector } from './base';
import { UPICOrder, POSTestResult, POSOrderResult } from '../types';

export class NuevoPOSConnector extends BasePOSConnector {
  async testConnection(): Promise<POSTestResult> {
    // Implementar lógica de test
  }

  async sendOrder(order: UPICOrder): Promise<POSOrderResult> {
    // Implementar envío de pedido
  }

  private transformOrder(order: UPICOrder): any {
    // Transformar al formato del POS
  }
}
```

2. **Agregar al factory** en `src/lib/pos/connectors/index.ts`

```typescript
case 'nuevopos':
  return new NuevoPOSConnector(credentials);
```

3. **Agregar a la lista** en `AVAILABLE_POS_TYPES`

```typescript
{
  value: 'nuevopos',
  label: 'Nuevo POS',
  description: 'Descripción del nuevo POS',
}
```

### Personalizar Transformación de Pedidos

Cada conector tiene un método `transformOrder()` que convierte el formato UPIC al formato específico del POS. Ajustar según la documentación de la API del POS.

### Manejo de Errores

- Los errores se registran en los logs
- Los pedidos fallidos se guardan para reintento (si `retryable: true`)
- El sistema no falla si hay error con POS (no crítico)

### Logging

Todos los eventos se registran usando el logger:

```typescript
logger.info({ orderId, posType }, 'Pedido enviado al POS');
logger.error({ error, orderId }, 'Error enviando pedido al POS');
```

## 📝 Notas Importantes

1. **Endpoints Placeholder**: Los endpoints en los conectores son placeholders. Reemplazar con los endpoints reales cuando estén disponibles.

2. **Autenticación**: Cada POS puede usar diferentes métodos de autenticación (API Key, Bearer Token, Basic Auth). Ajustar según la documentación.

3. **Formato de Datos**: Cada POS puede requerir un formato diferente. Ajustar el método `transformOrder()` en cada conector.

4. **No Bloqueante**: El envío a POS no bloquea el flujo principal. Si falla, se registra pero no afecta el pedido.

5. **Reintentos**: Los pedidos fallidos con `retryable: true` pueden ser reintentados posteriormente (implementar cola si es necesario).

## 🚀 Próximos Pasos

- [ ] Implementar cola de reintentos para pedidos fallidos
- [ ] Agregar webhooks de POS para actualizar estado de pedidos
- [ ] Dashboard de monitoreo de integraciones POS
- [ ] Sincronización bidireccional de inventario
- [ ] Soporte para múltiples ubicaciones/tiendas

## 📞 Soporte

Para preguntas o problemas con la integración POS, contactar al equipo de desarrollo.

---

**Última actualización**: Enero 2024
