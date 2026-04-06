# Arquitectura: Gestión de Centrales y Franquicias

## 📋 Resumen Ejecutivo

Este documento describe la arquitectura completa para el módulo de **Gestión de Centrales y Franquicias**, que permite escalar de un modelo 1:1 (tienda por tienda) a un modelo 1:N (cadena con cientos de puntos), con menú centralizado y control jerárquico.

---

## 🗄️ Diagrama ER (Esquema de Base de Datos)

```
┌─────────────┐
│   Central   │ (Entidad Padre)
├─────────────┤
│ id          │
│ name        │
│ legalName   │ (NIT/Razón Social)
│ logoUrl     │
│ bannerUrl   │
│ commission% │ (Valor base)
│ freeFeeThr  │ (Umbral para fee gratis)
│ lowOrderFee │ (Costo del fee)
│ isActive    │
└──────┬──────┘
       │ 1
       │
       │ N
┌──────▼──────────┐
│   Restaurant    │ (Entidad Hija)
├─────────────────┤
│ id              │
│ placeId         │──┐
│ centralId       │──┘ FK a Central
│ name            │
│ commission%     │ (Heredado de Central)
│ freeFeeThr      │ (Heredado de Central)
│ lowOrderFee     │ (Heredado de Central)
└──────┬──────────┘
       │ 1
       │
       │ N
┌──────▼──────────────┐
│  BranchProduct      │
├─────────────────────┤
│ id                  │
│ restaurantId        │──┐
│ masterProductId     │──┘
│ localPrice          │ (NULL = usar basePrice)
│ isLocallyActive     │
└─────────────────────┘
       │ N
       │
       │ 1
┌──────▼──────────────┐
│  MasterProduct      │
├─────────────────────┤
│ id                  │
│ centralId           │──┐ FK a Central
│ name                │
│ description         │
│ imageUrl            │
│ sku                 │
│ basePrice           │ (Precio base sugerido)
│ isGloballyAvailable │ ⚠️ PANIC BUTTON
└─────────────────────┘

┌─────────────┐
│    User     │
├─────────────┤
│ id          │
│ email       │
│ role        │ (central_admin, restaurant_admin, etc.)
│ centralId   │──┐ FK a Central (para central_admin)
│ restaurantId│──┘ FK a Restaurant
└─────────────┘
```

---

## 🔍 Query de Lectura de Menú (Lógica Jerárquica)

### Tabla de Verdad

| MasterProduct.isGloballyAvailable | BranchProduct.isLocallyActive | Producto Visible |
|-----------------------------------|------------------------------|------------------|
| TRUE                               | TRUE                          | ✅ SÍ            |
| TRUE                               | FALSE                         | ❌ NO            |
| FALSE                              | TRUE                          | ❌ NO (Panic)    |
| FALSE                              | FALSE                         | ❌ NO            |

**Regla del Pánico**: Si `isGloballyAvailable = FALSE`, el producto se oculta en **TODAS** las tiendas, sin importar `isLocallyActive`.

### SQL Query Optimizada

```sql
SELECT
  bp.id,
  mp.id as "masterProductId",
  mp.name,
  mp.description,
  mp."imageUrl",
  mp."imagePosition",
  mp."imageScale",
  mp.sku,
  -- Lógica de precio: COALESCE(local_price, base_price)
  COALESCE(bp."localPrice", mp."basePrice") as price,
  mp."basePrice" as "basePrice",
  bp."localPrice" as "localPrice",
  -- Lógica de disponibilidad: ambas condiciones TRUE
  (mp."isGloballyAvailable" = true AND bp."isLocallyActive" = true) as "isAvailable",
  mp."isGloballyAvailable" as "isGloballyAvailable",
  bp."isLocallyActive" as "isLocallyActive"
FROM "BranchProduct" bp
INNER JOIN "MasterProduct" mp ON bp."masterProductId" = mp.id
WHERE bp."restaurantId" = $1
  -- Solo productos disponibles según la regla del pánico
  AND mp."isGloballyAvailable" = true
  AND bp."isLocallyActive" = true
ORDER BY mp.name ASC;
```

**Implementación**: Ver `src/lib/central-menu-query.ts`

---

## 🚀 Pseudocódigo: createCentralAndDeploy()

```typescript
async function createCentralAndDeploy(input: {
  name: string;
  legalName?: string;
  logoUrl?: string;
  bannerUrl?: string;
  commissionPercentage: number;
  freeFeeThreshold: number;
  lowOrderFee: number;
  hubIds: string[];
  adminEmails?: string[];
}) {
  return await prisma.$transaction(async (tx) => {
    // 1. CREAR CENTRAL
    const central = await tx.central.create({
      data: {
        name: input.name,
        legalName: input.legalName,
        logoUrl: input.logoUrl,
        bannerUrl: input.bannerUrl,
        commissionPercentage: input.commissionPercentage,
        freeFeeThreshold: input.freeFeeThreshold, // En centavos
        lowOrderFee: input.lowOrderFee, // En centavos
        isActive: true,
      },
    });

    // 2. VALIDAR HUBS
    const hubs = await tx.place.findMany({
      where: { id: { in: input.hubIds }, isActive: true },
    });
    
    if (hubs.length !== input.hubIds.length) {
      throw new Error('Uno o más Hubs no existen');
    }

    // 3. CREAR RESTAURANTES (ITERACIÓN)
    const restaurants = [];
    for (const hub of hubs) {
      const slug = generateUniqueSlug(`${input.name}-${hub.name}`);
      
      const restaurant = await tx.restaurant.create({
        data: {
          placeId: hub.id,
          centralId: central.id,
          name: `${input.name} - ${hub.name}`,
          slug,
          // REPLICACIÓN FINANCIERA: Copiar valores de Central
          commissionPercentage: input.commissionPercentage,
          freeFeeThreshold: input.freeFeeThreshold,
          lowOrderFee: input.lowOrderFee,
          isActive: true,
        },
      });
      
      restaurants.push(restaurant);
    }

    // 4. ASIGNAR ADMINS LOCALES
    const assignedAdmins = [];
    if (input.adminEmails && input.adminEmails.length > 0) {
      for (let i = 0; i < input.adminEmails.length && i < restaurants.length; i++) {
        const email = input.adminEmails[i];
        const restaurant = restaurants[i];
        
        let adminUser = await tx.user.findUnique({ where: { email } });
        
        if (!adminUser) {
          adminUser = await tx.user.create({
            data: {
              email,
              role: 'restaurant_admin',
              restaurantId: restaurant.id,
            },
          });
        } else {
          adminUser = await tx.user.update({
            where: { id: adminUser.id },
            data: { restaurantId: restaurant.id },
          });
        }
        
        assignedAdmins.push({ email, restaurantId: restaurant.id });
      }
    }

    // 5. REPLICAR MENÚ MASTER (Si existe)
    const existingMasterProducts = await tx.masterProduct.findMany({
      where: { centralId: central.id },
    });

    if (existingMasterProducts.length > 0) {
      const branchProductsData = [];
      for (const masterProduct of existingMasterProducts) {
        for (const restaurant of restaurants) {
          branchProductsData.push({
            restaurantId: restaurant.id,
            masterProductId: masterProduct.id,
            localPrice: null, // Usar precio base
            isLocallyActive: masterProduct.isGloballyAvailable,
          });
        }
      }
      
      await tx.branchProduct.createMany({
        data: branchProductsData,
        skipDuplicates: true,
      });
    }

    return {
      central,
      restaurants,
      assignedAdmins,
      replicatedProducts: existingMasterProducts.length,
    };
  });
}
```

**Implementación**: Ver `src/app/api/superadmin/centrals/route.ts` (POST)

---

## 📊 Dashboard del Admin de Central

### Consulta Optimizada de Métricas

```sql
-- Métricas Globales Agregadas
SELECT
  COUNT(DISTINCT o.id) as "totalOrders",
  SUM(o."totalAmount" - COALESCE(o."serviceFeeAmount", 0)) as "totalSales",
  AVG(o."totalAmount" - COALESCE(o."serviceFeeAmount", 0)) as "averageTicket"
FROM "Order" o
INNER JOIN "Restaurant" r ON o."restaurantId" = r.id
WHERE r."centralId" = $1
  AND r."isActive" = true
  AND o.status IN ('paid', 'in_progress', 'ready', 'delivered')
  AND o."createdAt" >= $2 -- dateFrom
  AND o."createdAt" <= $3 -- dateTo
  AND ($4::text IS NULL OR r."placeId" = $4) -- placeId filter
  AND ($5::text IS NULL OR r.place."cityId" = $5); -- cityId filter

-- Desglose por Restaurante (Ranking)
SELECT
  r.id,
  r.name,
  r.slug,
  p.name as "placeName",
  c.name as "cityName",
  COUNT(DISTINCT o.id) as "orderCount",
  SUM(o."totalAmount" - COALESCE(o."serviceFeeAmount", 0)) as "sales",
  AVG(o."totalAmount" - COALESCE(o."serviceFeeAmount", 0)) as "averageTicket"
FROM "Restaurant" r
INNER JOIN "Order" o ON o."restaurantId" = r.id
INNER JOIN "Place" p ON r."placeId" = p.id
LEFT JOIN "City" c ON p."cityId" = c.id
WHERE r."centralId" = $1
  AND r."isActive" = true
  AND o.status IN ('paid', 'in_progress', 'ready', 'delivered')
  AND o."createdAt" >= $2
  AND o."createdAt" <= $3
GROUP BY r.id, r.name, r.slug, p.name, c.name
ORDER BY sales DESC; -- Ranking
```

**Implementación**: Ver `src/app/api/central-admin/dashboard/route.ts`

### KPIs del Dashboard

- **Total de Ventas**: Suma de `totalAmount - serviceFeeAmount` de todas las órdenes
- **Total de Pedidos**: Conteo de órdenes en estados válidos
- **Ticket Promedio Global**: `totalSales / totalOrders`
- **Ranking de Restaurantes**: Ordenado por ventas descendente

---

## 🔄 Estrategia de Actualización Masiva

### 1. Actualización de Precios Masiva

**Caso de Uso**: Cambiar el precio base de múltiples MasterProducts

```typescript
// Actualizar precio de un MasterProduct
await updateMasterProductPrice(masterProductId, newBasePrice);

// Actualización masiva de múltiples productos
await bulkUpdateMasterProductPrices(centralId, [
  { masterProductId: 'xxx', newBasePrice: 15000 },
  { masterProductId: 'yyy', newBasePrice: 20000 },
]);
```

**Efecto**: Los BranchProducts que tienen `localPrice = NULL` automáticamente usarán el nuevo `basePrice` gracias a `COALESCE`.

### 2. Actualización de Valores Financieros

**Caso de Uso**: Cambiar comisión, umbral de fee o costo de fee en toda la Central

```typescript
await updateCentralFinancials(
  centralId,
  commissionPercentage: 6.5, // Nuevo %
  freeFeeThreshold: 30000,    // Nuevo umbral (centavos)
  lowOrderFee: 1000          // Nuevo fee (centavos)
);
```

**Efecto**: Se actualiza la Central y **todos** los restaurantes de la Central en una transacción.

### 3. Panic Button (Disponibilidad Global)

**Caso de Uso**: Ocultar un producto en TODAS las tiendas instantáneamente

```typescript
await updateGlobalAvailability(masterProductId, false);
```

**Efecto**: El producto desaparece de todos los menús, sin importar `isLocallyActive`.

---

## 📁 Estructura de Archivos

```
src/
├── lib/
│   ├── central-menu-query.ts      # Query optimizada de menú jerárquico
│   ├── central-sync.ts            # Sincronización MasterProduct -> BranchProduct
│   └── central-bulk-update.ts     # Actualizaciones masivas
├── app/
│   └── api/
│       ├── superadmin/
│       │   ├── centrals/
│       │   │   └── route.ts       # GET/POST: Listar y crear Central
│       │   └── master-products/
│       │       ├── route.ts       # GET/POST: Listar y crear MasterProduct
│       │       └── [id]/
│       │           └── route.ts   # PATCH/DELETE: Actualizar/eliminar
│       └── central-admin/
│           └── dashboard/
│               └── route.ts       # GET: Métricas agregadas
└── prisma/
    └── schema.prisma              # Schema actualizado con nuevos modelos
```

---

## 🔐 Autenticación y Autorización

### Roles

- **superadmin**: Acceso total a todas las Centrales
- **central_admin**: Acceso solo a su Central (`user.centralId`)
- **restaurant_admin**: Acceso solo a su Restaurante (`user.restaurantId`)

### Validaciones

- El `central_admin` solo puede ver/editar datos donde `restaurant.centralId = user.centralId`
- El `restaurant_admin` solo puede ver/editar datos donde `restaurant.id = user.restaurantId`

---

## 🎯 Flujos Principales

### Flujo 1: Crear Central y Desplegar

1. Superadmin crea Central con datos financieros
2. Selecciona Hubs (Places) donde crear restaurantes
3. Sistema crea restaurantes heredando valores financieros
4. Si hay MasterProducts, se replican automáticamente
5. Se asignan admins locales (opcional)

### Flujo 2: Crear MasterProduct

1. Superadmin crea MasterProduct en Central
2. Sistema sincroniza automáticamente a todos los restaurantes activos
3. Se crean BranchProducts con `localPrice = NULL` y `isLocallyActive = true`

### Flujo 3: Leer Menú de Restaurante

1. Cliente solicita menú de restaurante
2. Query ejecuta JOIN entre BranchProduct y MasterProduct
3. Aplica lógica de precio: `COALESCE(localPrice, basePrice)`
4. Filtra por disponibilidad: `isGloballyAvailable AND isLocallyActive`
5. Retorna productos visibles con precios calculados

### Flujo 4: Panic Button

1. Central admin desactiva producto globalmente
2. `isGloballyAvailable = false`
3. Producto desaparece de TODOS los menús instantáneamente
4. No importa el valor de `isLocallyActive`

---

## ⚡ Optimizaciones

1. **Índices**: Todos los FKs tienen índices para JOINs rápidos
2. **Vista Materializada** (Futuro): Para métricas del dashboard
3. **Caché**: Menús pueden cachearse con invalidación cuando cambia `isGloballyAvailable`
4. **Batch Operations**: `createMany` para inserción masiva de BranchProducts

---

## 📝 Notas de Implementación

- Los valores financieros se almacenan en **centavos** para evitar problemas de precisión
- `centralId` en Restaurant es **opcional** para mantener compatibilidad con restaurantes independientes
- La sincronización de MasterProduct es **asíncrona** pero puede hacerse síncrona en el mismo endpoint
- El "Panic Button" es **inmediato** y no requiere sincronización adicional

---

## 🚦 Próximos Pasos

1. ✅ Schema de base de datos
2. ✅ Migración SQL
3. ✅ Query de menú jerárquico
4. ✅ Endpoint de despliegue masivo
5. ✅ Dashboard de Admin Central
6. ✅ Estrategia de actualización masiva
7. ⏳ Frontend: Panel de Superadmin para gestionar Centrales
8. ⏳ Frontend: Panel de Central Admin
9. ⏳ Integración con el menú existente (Product model)

