# Sistema de Menú Híbrido - YouPick

Este documento describe el sistema de menú híbrido implementado en YouPick, que permite usar el POS como fuente de verdad del menú mientras permite personalización visual completa.

## 📋 Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Arquitectura](#arquitectura)
3. [Modos de Operación](#modos-de-operación)
4. [Flujo de Sincronización](#flujo-de-sincronización)
5. [Personalización Visual](#personalización-visual)
6. [Envío de Pedidos](#envío-de-pedidos)
7. [API Endpoints](#api-endpoints)
8. [Configuración](#configuración)

## 🎯 Descripción General

El sistema de menú híbrido permite dos modos de operación:

### MODO A — POS como fuente del menú (preferido)

- El POS es la fuente de verdad del menú operativo
- YouPick importa categorías, productos, precios e IDs desde el POS
- Cada ítem conserva su `posItemId` para envío de pedidos
- Inventario, precios y estados dependen del POS
- **Personalización visual permitida**: nombre comercial, descripción, imágenes, orden, visibilidad

### MODO B — Menú creado en YouPick

- El menú se crea manualmente en YouPick
- YouPick es la fuente de verdad
- Los ítems no tienen `posItemId`

## 🏗️ Arquitectura

```
┌─────────────────┐
│   POS System    │
│  (Fuente verdad)│
└────────┬────────┘
         │
         │ getMenu()
         ▼
┌─────────────────┐
│ MenuSyncService │
│  (Normalización)│
└────────┬────────┘
         │
         │ syncMenuToDatabase()
         ▼
┌─────────────────┐
│   Database      │
│  (YouPick)      │
│                 │
│ Product:        │
│ - posItemId     │
│ - displayName   │
│ - menuSource    │
└────────┬────────┘
         │
         │ Personalización visual
         ▼
┌─────────────────┐
│  Admin Panel    │
│  (Editor UI)    │
└─────────────────┘
```

## 🔄 Modos de Operación

### Campos de Base de Datos

#### Product

- `posItemId`: ID del item en el POS (crítico para envío de pedidos)
- `displayName`: Nombre comercial personalizado (sobrescribe `name` para visualización)
- `menuSource`: `POS` o `MANUAL`
- `posLastSyncedAt`: Última sincronización desde POS
- `posPrice`: Precio desde POS (para comparación)
- `posInventoryQuantity`: Inventario desde POS (si aplica)

#### Category

- `posCategoryId`: ID de categoría en el POS
- `displayName`: Nombre comercial personalizado
- `menuSource`: `POS` o `MANUAL`
- `posLastSyncedAt`: Última sincronización desde POS

## 🔄 Flujo de Sincronización

### 1. Importación Inicial

```typescript
POST /api/admin/restaurant/menu/import
{
  "posType": "loyverse",
  "credentials": {
    "apiToken": "...",
    "baseUrl": "https://api.loyverse.com"
  }
}
```

**Proceso:**

1. Conector POS obtiene menú completo (`getMenu()`)
2. MenuSyncService normaliza datos
3. Crea/actualiza categorías y productos
4. Guarda `posItemId` y `posCategoryId`
5. Marca `menuSource = 'POS'`

### 2. Re-sincronización

```typescript
POST / api / admin / restaurant / menu / sync;
```

**Proceso:**

1. Usa configuración POS guardada del restaurante
2. Actualiza precios, nombres, inventario desde POS
3. **Preserva personalizaciones visuales**:
   - `displayName` (si existe, no se sobrescribe)
   - `imageUrl`, `imagePosition`, `imageScale`
   - `sort`, `isActive`, `isFeatured`
   - `promotionPrice` (puede ser personalizado)

### 3. Preservación de Personalizaciones

El sistema **NUNCA** sobrescribe:

- `displayName` (nombre comercial personalizado)
- `imageUrl`, `imagePosition`, `imageScale` (imágenes personalizadas)
- `sort` (orden visual)
- `isActive`, `isFeatured` (visibilidad personalizada)
- `promotionPrice` (precios promocionales personalizados)

El sistema **SÍ actualiza**:

- `name` (nombre desde POS, usado internamente)
- `price` (precio desde POS)
- `posPrice` (precio POS para comparación)
- `posInventoryQuantity` (inventario desde POS)
- `posLastSyncedAt` (fecha de sincronización)

## 🎨 Personalización Visual

### Editor de Menú en Admin Panel

El admin puede personalizar:

1. **Nombre Comercial** (`displayName`)
   - Sobrescribe el nombre del POS para visualización
   - El nombre del POS se mantiene en `name` para referencia

2. **Imágenes**
   - Subir imágenes personalizadas
   - Ajustar posición y escala
   - Las imágenes del POS se pueden reemplazar

3. **Orden Visual** (`sort`)
   - Reordenar categorías y productos
   - El orden del POS se ignora

4. **Visibilidad**
   - Ocultar productos/categorías del POS
   - Destacar productos (`isFeatured`)

5. **Precios Promocionales**
   - Agregar precios promocionales personalizados
   - No se sobrescriben en sincronización

## 📦 Envío de Pedidos

### Cuando el ítem tiene `posItemId`

```typescript
// En transformUPICOrderToStandard()
items: order.items.map((item) => ({
  name: item.product.name,
  posItemId: item.product.posItemId, // ✅ Usado para envío al POS
  qty: item.quantity,
  price: item.unitPrice,
  // ...
}));
```

**En el conector POS:**

```typescript
// Ejemplo: Loyverse
line_items: order.items.map((item) => ({
  item_id: item.posItemId || item.name, // ✅ Usa posItemId si está disponible
  name: item.name,
  // ...
}));
```

### Cuando el ítem NO tiene `posItemId`

- El pedido se maneja internamente en YouPick
- No se envía al POS (o se envía con nombre como fallback)

## 🔌 API Endpoints

### Importar Menú desde POS

```typescript
POST /api/admin/restaurant/menu/import
Authorization: Bearer <token>

Body:
{
  "posType": "loyverse" | "vendty" | "siigo" | ...,
  "credentials": {
    "apiToken": "...",
    "baseUrl": "...",
    // ... otras credenciales
  }
}

Response:
{
  "success": true,
  "message": "Menú sincronizado exitosamente: 5 categorías, 25 productos",
  "data": {
    "imported": {
      "categories": 5,
      "products": 25
    },
    "updated": {
      "categories": 0,
      "products": 0
    }
  }
}
```

### Re-sincronizar Menú

```typescript
POST /api/admin/restaurant/menu/sync
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Menú sincronizado exitosamente",
  "data": {
    "imported": { "categories": 0, "products": 2 },
    "updated": { "categories": 5, "products": 23 }
  }
}
```

## ⚙️ Configuración

### Habilitar Integración POS

1. Ir a **Configuración > Integración POS**
2. Habilitar integración POS
3. Seleccionar tipo de POS
4. Ingresar credenciales
5. Probar conexión
6. **Importar menú desde POS**

### Conectores POS con Soporte de Menú

- ✅ **Loyverse**: Implementado con API oficial
- ✅ **Vendty**: Placeholder listo para implementar
- ✅ **Genérico**: Configurable para cualquier API REST

### Agregar Soporte de Menú a Nuevo POS

1. Implementar `getMenu()` en el conector:

```typescript
async getMenu(): Promise<POSMenu> {
  // 1. Obtener categorías
  const categories = await this.request('/api/v1/categories');

  // 2. Obtener items
  const items = await this.request('/api/v1/items');

  // 3. Normalizar y retornar
  return {
    categories: categories.map(...),
    items: items.map(...),
    syncedAt: new Date(),
  };
}
```

2. El `MenuSyncService` se encarga del resto

## 🔒 Reglas de Negocio

### Nunca Romper la Relación POS

- `posItemId` **NUNCA** se elimina manualmente
- Si un producto se elimina en el POS, se marca como `isActive = false` en YouPick
- La relación se mantiene para futuras sincronizaciones

### No Duplicar Inventario

- Si el POS maneja inventario, YouPick usa `posInventoryQuantity`
- YouPick NO duplica el control de inventario
- El inventario se sincroniza desde POS en cada re-sincronización

### Sincronización Sin Pérdida

- Las personalizaciones visuales se preservan siempre
- Solo se actualizan datos operativos (precios, nombres base, inventario)
- El admin puede personalizar libremente sin riesgo de perder cambios

## 📊 Flujo Completo

```
1. Admin configura POS
   └─> Test de conexión
   └─> Guardar credenciales

2. Admin importa menú desde POS
   └─> MenuSyncService.getMenu()
   └─> Normalizar datos
   └─> Guardar con posItemId
   └─> menuSource = 'POS'

3. Admin personaliza visualmente
   └─> Cambiar displayName
   └─> Subir imágenes
   └─> Reordenar
   └─> Personalizaciones se guardan

4. Cliente realiza pedido
   └─> Selecciona productos (muestra displayName)
   └─> Crea pedido
   └─> Pago aprobado

5. Envío a POS
   └─> transformUPICOrderToStandard()
   └─> Incluye posItemId
   └─> Conector POS usa posItemId
   └─> Pedido enviado correctamente

6. Re-sincronización periódica
   └─> Actualiza precios/inventario
   └─> Preserva personalizaciones
   └─> Mantiene relación posItemId
```

## 🚀 Próximos Pasos

1. **UI Admin**: Agregar botón "Importar menú desde POS" en página de menú
2. **Editor Visual**: Permitir editar `displayName`, imágenes, orden
3. **Sincronización Automática**: Programar sincronizaciones periódicas
4. **Notificaciones**: Alertar cuando precios/inventario cambien en POS
5. **Logs**: Historial de sincronizaciones y cambios

---

**Última actualización**: Enero 2024
**Versión**: 1.0.0
