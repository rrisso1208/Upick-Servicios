# Guía de Pruebas: Sistema de Centrales y Franquicias

## 📋 Endpoints para Probar

### 1. Superadmin - Gestión de Centrales

#### GET /api/superadmin/centrals
**Listar todas las centrales**

```http
GET http://localhost:3000/api/superadmin/centrals
Authorization: Bearer YOUR_TOKEN
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "centrals": [
      {
        "id": "central_xxx",
        "name": "Mi Franquicia",
        "legalName": "Mi Franquicia S.A.S.",
        "logoUrl": "https://...",
        "bannerUrl": "https://...",
        "commissionPercentage": 5.0,
        "freeFeeThreshold": 20000,
        "lowOrderFee": 800,
        "isActive": true,
        "_count": {
          "restaurants": 10,
          "masterProducts": 25,
          "users": 3
        }
      }
    ]
  }
}
```

#### POST /api/superadmin/centrals
**Crear nueva central**

```http
POST http://localhost:3000/api/superadmin/centrals
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "Mi Nueva Franquicia",
  "legalName": "Mi Nueva Franquicia S.A.S.",
  "logoUrl": "https://example.com/logo.png",
  "bannerUrl": "https://example.com/banner.png",
  "commissionPercentage": 6.5,
  "freeFeeThreshold": 30000,
  "lowOrderFee": 1000,
  "hubIds": ["place_xxx", "place_yyy"],
  "adminEmails": ["admin1@example.com", "admin2@example.com"]
}
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "central": { ... },
    "restaurantsCreated": 2,
    "restaurants": [ ... ],
    "assignedAdmins": [ ... ],
    "replicatedProducts": 0
  }
}
```

#### PATCH /api/superadmin/centrals/[id]
**Actualizar central**

```http
PATCH http://localhost:3000/api/superadmin/centrals/central_xxx
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "Nombre Actualizado",
  "commissionPercentage": 7.0,
  "propagateFinancials": true
}
```

#### DELETE /api/superadmin/centrals/[id]
**Eliminar central**

```http
DELETE http://localhost:3000/api/superadmin/centrals/central_xxx
Authorization: Bearer YOUR_TOKEN
```

---

### 2. Superadmin - Gestión de MasterProducts

#### GET /api/superadmin/master-products?centralId=xxx
**Listar productos maestros de una central**

```http
GET http://localhost:3000/api/superadmin/master-products?centralId=central_xxx
Authorization: Bearer YOUR_TOKEN
```

#### POST /api/superadmin/master-products
**Crear producto maestro**

```http
POST http://localhost:3000/api/superadmin/master-products
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "centralId": "central_xxx",
  "name": "Hamburguesa Clásica",
  "description": "Deliciosa hamburguesa con carne 100% res",
  "imageUrl": "https://example.com/burger.jpg",
  "sku": "BURGER-001",
  "basePrice": 15000,
  "isGloballyAvailable": true
}
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "masterProduct": { ... },
    "restaurantsSynced": 10
  }
}
```

#### PATCH /api/superadmin/master-products/[id]
**Actualizar producto maestro (incluye Panic Button)**

```http
PATCH http://localhost:3000/api/superadmin/master-products/master_xxx
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "isGloballyAvailable": false
}
```

**Efecto:** El producto desaparece de TODOS los menús instantáneamente.

#### DELETE /api/superadmin/master-products/[id]
**Eliminar producto maestro**

```http
DELETE http://localhost:3000/api/superadmin/master-products/master_xxx
Authorization: Bearer YOUR_TOKEN
```

---

### 3. Central Admin - Dashboard

#### GET /api/central-admin/dashboard
**Obtener métricas agregadas**

```http
GET http://localhost:3000/api/central-admin/dashboard?dateFrom=2024-01-01&dateTo=2024-01-31&cityId=city_xxx
Authorization: Bearer YOUR_TOKEN
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "totalSales": 5000000,
    "totalOrders": 250,
    "averageTicket": 20000,
    "restaurants": [
      {
        "id": "restaurant_xxx",
        "name": "Mi Franquicia - Hub Centro",
        "slug": "mi-franquicia-hub-centro",
        "place": {
          "id": "place_xxx",
          "name": "Hub Centro",
          "city": {
            "id": "city_xxx",
            "name": "Bogotá"
          }
        },
        "sales": 2000000,
        "orderCount": 100,
        "averageTicket": 20000
      }
    ]
  }
}
```

---

### 4. Menú Jerárquico (Público)

#### GET /api/restaurants/[slug]/menu
**Obtener menú del restaurante**

```http
GET http://localhost:3000/api/restaurants/mi-franquicia-hub-centro/menu
```

**Si el restaurante pertenece a una Central:**
```json
{
  "success": true,
  "data": {
    "restaurant": { ... },
    "categories": [
      {
        "id": "cat_xxx",
        "name": "Hamburguesas",
        "products": [
          {
            "id": "branch_xxx",
            "masterProductId": "master_xxx",
            "name": "Hamburguesa Clásica",
            "description": "...",
            "price": 15000,
            "basePrice": 15000,
            "localPrice": null,
            "imageUrl": "...",
            "prepMinutes": 10,
            "optionGroups": []
          }
        ]
      }
    ],
    "isHierarchical": true
  }
```

**Si el restaurante es independiente:**
```json
{
  "success": true,
  "data": {
    "restaurant": { ... },
    "categories": [ ... ],
    "isHierarchical": false
  }
}
```

---

## 🧪 Flujo de Prueba Completo

### Paso 1: Crear Central y Desplegar Restaurantes

1. **Crear Central:**
```bash
POST /api/superadmin/centrals
{
  "name": "Test Franquicia",
  "commissionPercentage": 5.0,
  "freeFeeThreshold": 20000,
  "lowOrderFee": 800,
  "hubIds": ["place_1", "place_2"]
}
```

2. **Verificar que se crearon los restaurantes:**
```bash
GET /api/superadmin/restaurants
# Buscar restaurantes con centralId = central_xxx
```

### Paso 2: Crear MasterProducts

1. **Crear producto maestro:**
```bash
POST /api/superadmin/master-products
{
  "centralId": "central_xxx",
  "name": "Producto Test",
  "basePrice": 10000,
  "isGloballyAvailable": true
}
```

2. **Verificar que se sincronizó a todos los restaurantes:**
```bash
# Verificar en la base de datos:
SELECT * FROM "BranchProduct" WHERE "masterProductId" = 'master_xxx';
# Debe haber un registro por cada restaurante de la central
```

### Paso 3: Probar Panic Button

1. **Desactivar producto globalmente:**
```bash
PATCH /api/superadmin/master-products/master_xxx
{
  "isGloballyAvailable": false
}
```

2. **Verificar que desaparece del menú:**
```bash
GET /api/restaurants/[slug]/menu
# El producto NO debe aparecer en la respuesta
```

3. **Reactivar:**
```bash
PATCH /api/superadmin/master-products/master_xxx
{
  "isGloballyAvailable": true
}
```

### Paso 4: Probar Dashboard de Central Admin

1. **Obtener métricas:**
```bash
GET /api/central-admin/dashboard?dateFrom=2024-01-01&dateTo=2024-01-31
```

2. **Verificar ranking de restaurantes:**
```bash
# Los restaurantes deben estar ordenados por ventas (mayor a menor)
```

---

## 🔍 Verificaciones en Base de Datos

### Verificar estructura:
```sql
-- Ver todas las centrales
SELECT * FROM "Central";

-- Ver restaurantes de una central
SELECT * FROM "Restaurant" WHERE "centralId" = 'central_xxx';

-- Ver productos maestros
SELECT * FROM "MasterProduct" WHERE "centralId" = 'central_xxx';

-- Ver instancias locales (BranchProducts)
SELECT 
  bp.*,
  mp.name as "master_name",
  r.name as "restaurant_name"
FROM "BranchProduct" bp
INNER JOIN "MasterProduct" mp ON bp."masterProductId" = mp.id
INNER JOIN "Restaurant" r ON bp."restaurantId" = r.id
WHERE mp."centralId" = 'central_xxx';
```

### Verificar lógica de precio:
```sql
-- Ver productos con precio calculado
SELECT
  mp.name,
  mp."basePrice" as "precio_base",
  bp."localPrice" as "precio_local",
  COALESCE(bp."localPrice", mp."basePrice") as "precio_final"
FROM "BranchProduct" bp
INNER JOIN "MasterProduct" mp ON bp."masterProductId" = mp.id
WHERE bp."restaurantId" = 'restaurant_xxx';
```

### Verificar disponibilidad (Panic Button):
```sql
-- Productos disponibles (según regla del pánico)
SELECT
  mp.name,
  mp."isGloballyAvailable" as "disponible_global",
  bp."isLocallyActive" as "disponible_local",
  (mp."isGloballyAvailable" = true AND bp."isLocallyActive" = true) as "visible"
FROM "BranchProduct" bp
INNER JOIN "MasterProduct" mp ON bp."masterProductId" = mp.id
WHERE bp."restaurantId" = 'restaurant_xxx';
```

---

## 📝 Notas de Prueba

1. **Autenticación:** Todos los endpoints de superadmin y central-admin requieren autenticación Bearer token.

2. **Conversión de Moneda:** Los valores financieros se almacenan en centavos. Al enviar desde el frontend, multiplicar por 100.

3. **Sincronización:** La sincronización de MasterProduct a BranchProduct es automática al crear el producto.

4. **Panic Button:** El efecto es inmediato. No requiere sincronización adicional.

5. **Compatibilidad:** Los restaurantes sin `centralId` siguen usando el sistema tradicional de productos.

---

## 🐛 Troubleshooting

### Error: "Central no encontrada"
- Verificar que el `centralId` existe en la base de datos.

### Error: "Uno o más Hubs no existen"
- Verificar que los `hubIds` (placeIds) existen y están activos.

### Productos no aparecen en el menú
- Verificar `isGloballyAvailable = true` en MasterProduct
- Verificar `isLocallyActive = true` en BranchProduct
- Verificar que existe BranchProduct para ese restaurante

### Dashboard vacío
- Verificar que el usuario tiene `role = 'central_admin'` y `centralId` asignado
- Verificar que hay restaurantes con `centralId` del usuario
- Verificar que hay órdenes en el rango de fechas

