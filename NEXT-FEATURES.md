# 🚀 Próximas Funcionalidades a Implementar

Una vez que tengas el proyecto funcionando (siguiendo `SETUP-GUIDE.md`), estos son los pasos siguientes recomendados:

---

## 1. Completar el Flujo de Checkout ⭐ PRIORITARIO

### Lo que ya está:
- ✅ Página de checkout (`/checkout/page.tsx`)
- ✅ SlotPicker component
- ✅ API de crear orden
- ✅ API de reservar slot
- ✅ API de payment session

### Lo que falta:
- [ ] **Guardar carrito en localStorage** al agregar productos
- [ ] **Página de menú funcional** con botones "Agregar al carrito"
- [ ] **Validación de stock** antes de crear orden
- [ ] **Manejo de opciones de producto** (tamaños, extras)

### Cómo hacerlo:

#### Paso 1: Actualizar la página del menú

Edita: `src/app/[universitySlug]/[restaurantSlug]/page.tsx`

Reemplaza el contenido mock con una llamada real a la API:

```typescript
useEffect(() => {
  fetch(`/api/restaurants/${restaurantSlug}/menu`)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setMenu(data.data);
      }
    });
}, [restaurantSlug]);
```

#### Paso 2: Implementar el carrito

Crea: `src/lib/cart.ts`

```typescript
export interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  options?: Array<{
    productOptionId: string;
    name: string;
    priceDelta: number;
  }>;
}

export function addToCart(item: CartItem) {
  const cart = getCart();
  const existing = cart.find(i => i.productId === item.productId);
  
  if (existing) {
    existing.quantity += item.quantity;
  } else {
    cart.push(item);
  }
  
  localStorage.setItem('upic_cart', JSON.stringify(cart));
}

export function getCart(): CartItem[] {
  const saved = localStorage.getItem('upic_cart');
  return saved ? JSON.parse(saved) : [];
}

export function clearCart() {
  localStorage.removeItem('upic_cart');
}
```

---

## 2. Implementar Realtime Updates 🔄

### Objetivo:
Que los pedidos se actualicen en tiempo real sin refrescar la página.

### Lo que necesitas:

1. **Configurar Supabase Realtime**

En el panel admin de restaurante:

```typescript
// src/app/admin/orders/page.tsx

useEffect(() => {
  const channel = supabase
    .channel('orders')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'Order',
      filter: `restaurantId=eq.${restaurantId}`
    }, (payload) => {
      // Actualizar estado local
      fetchOrders();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

2. **Habilitar Realtime en Supabase**

- Ve a Database > Replication
- Activa la tabla `Order`
- Guarda cambios

---

## 3. Panel de Métricas Real (no mock) 📊

### Crear endpoint de métricas

`src/app/api/admin/metrics/route.ts`

```typescript
export async function GET(req: NextRequest) {
  const user = await requireRole(['restaurant_admin', 'superadmin']);
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const metrics = await prisma.orderFinance.aggregate({
    where: {
      order: {
        restaurantId: user.restaurantId,
        createdAt: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
        status: { in: ['paid', 'in_progress', 'ready', 'delivered'] }
      }
    },
    _sum: {
      baseAmount: true,
      taxAmount: true,
      commissionAmount: true,
      gatewayFeeAmount: true,
      netForRestaurant: true,
    },
    _count: true,
  });

  return NextResponse.json({
    success: true,
    data: {
      totalOrders: metrics._count,
      totalSales: metrics._sum.baseAmount || 0,
      totalCommission: metrics._sum.commissionAmount || 0,
      totalFees: metrics._sum.gatewayFeeAmount || 0,
      netRevenue: metrics._sum.netForRestaurant || 0,
    }
  });
}
```

---

## 4. CRUD Completo de Menú 📝

### Endpoints necesarios:

```typescript
// Crear producto
POST /api/admin/products
Body: { categoryId, name, description, price, prepMinutes }

// Actualizar producto
PATCH /api/admin/products/:id
Body: { name?, price?, isActive? }

// Eliminar producto
DELETE /api/admin/products/:id

// Crear categoría
POST /api/admin/categories
Body: { name, sort }

// Actualizar orden de categorías
PATCH /api/admin/categories/reorder
Body: { categories: [{ id, sort }] }
```

### Drag & Drop para reordenar

Instala: `@dnd-kit/core`

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable
```

---

## 5. Exportación de Reportes 📄

### CSV Export

`src/app/api/admin/export/route.ts`

```typescript
export async function GET(req: NextRequest) {
  const user = await requireRestaurantAccess(restaurantId);
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const orders = await prisma.order.findMany({
    where: {
      restaurantId: user.restaurantId,
      createdAt: { gte: new Date(from!), lte: new Date(to!) }
    },
    include: { finance: true, student: true }
  });

  // Generar CSV
  const csv = [
    'Orden ID,Fecha,Cliente,Total,Comisión,Fees,Neto',
    ...orders.map(o => 
      `${o.id},${o.createdAt},${o.student.email},${o.totalAmount},${o.finance?.commissionAmount},${o.finance?.gatewayFeeAmount},${o.finance?.netForRestaurant}`
    )
  ].join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="orders-${from}-${to}.csv"`
    }
  });
}
```

---

## 6. Sistema de Notificaciones Push 🔔

### Web Push Notifications

1. **Generar VAPID keys**

```bash
npx web-push generate-vapid-keys
```

2. **Configurar service worker**

`public/sw.js`

```javascript
self.addEventListener('push', function(event) {
  const data = event.data.json();
  
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/badge.png',
    data: data
  });
});
```

3. **Registrar en la app**

```typescript
// src/lib/notifications/push.ts
export async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  });
  
  // Enviar subscription al servidor
  await fetch('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription)
  });
}
```

---

## 7. Validación de QR al Recoger 📱

### Crear escáner QR

`src/app/admin/scan/page.tsx`

Instalar: `react-qr-reader`

```bash
pnpm add react-qr-reader
```

```typescript
import { QrReader } from 'react-qr-reader';

export default function QRScanPage() {
  const handleScan = async (result: any) => {
    if (result) {
      // result contiene el orderId
      const response = await fetch(`/api/admin/orders/${result}/validate`, {
        method: 'POST'
      });
      
      if (response.ok) {
        // Marcar como entregado
        await fetch(`/api/admin/orders/${result}/status`, {
          method: 'POST',
          body: JSON.stringify({ status: 'delivered' })
        });
        
        alert('Pedido entregado correctamente!');
      }
    }
  };

  return (
    <QrReader
      onResult={handleScan}
      constraints={{ facingMode: 'environment' }}
    />
  );
}
```

---

## 8. Panel Superadmin Completo 👑

### Gestión de Universidades

```typescript
// src/app/api/superadmin/universities/route.ts

export async function POST(req: NextRequest) {
  await requireRole(['superadmin']);
  const body = await req.json();
  
  const university = await prisma.university.create({
    data: {
      name: body.name,
      slug: slugify(body.name),
      isActive: true,
    }
  });
  
  return NextResponse.json({ success: true, data: university });
}
```

### Gestión de Comisiones

Interfaz para crear/editar políticas de comisión con:
- Selector de scope (global/university/restaurant)
- Tipo (fixed/tiered)
- Rangos de vigencia
- Preview de cálculos

---

## 9. Tests E2E con Playwright 🧪

### Test de checkout completo

`tests/e2e/checkout.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('complete checkout flow', async ({ page }) => {
  // 1. Ir a la home
  await page.goto('http://localhost:3000');
  
  // 2. Seleccionar universidad
  await page.click('text=Universidad Nacional');
  
  // 3. Seleccionar restaurante
  await page.click('text=Cafetería Central');
  
  // 4. Agregar producto
  await page.click('button:has-text("Agregar")');
  
  // 5. Ir al checkout
  await page.click('text=Continuar');
  
  // 6. Seleccionar slot
  await page.click('[data-testid="slot-picker"] button:first-child');
  
  // 7. Verificar total
  await expect(page.locator('text=Total')).toBeVisible();
  
  // 8. Click en pagar
  await page.click('text=Pagar Ahora');
  
  // 9. Verificar redirección
  await expect(page).toHaveURL(/\/orders\/.*\/receipt/);
});
```

Ejecutar:
```bash
pnpm test:e2e
```

---

## 10. Mejoras de UX/UI 🎨

### Skeleton Loaders

Reemplazar "Cargando..." con skeletons:

```typescript
// src/components/ui/Skeleton.tsx
export function RestaurantCardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="h-48 bg-gray-200 rounded-lg mb-4" />
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
    </div>
  );
}
```

### Toast Notifications

Instalar: `sonner`

```bash
pnpm add sonner
```

```typescript
import { toast } from 'sonner';

// En lugar de alert()
toast.success('Producto agregado al carrito!');
toast.error('Error al procesar el pago');
```

### Estados vacíos mejorados

```typescript
{orders.length === 0 && (
  <div className="py-12 text-center">
    <Package className="mx-auto h-16 w-16 text-gray-300" />
    <h3 className="mt-4 text-lg font-medium">No hay pedidos</h3>
    <p className="mt-2 text-sm text-gray-500">
      Los pedidos aparecerán aquí cuando los estudiantes ordenen
    </p>
  </div>
)}
```

---

## 📊 Prioridad Recomendada

1. **Alta prioridad:**
   - ✅ Checkout completo con carrito
   - ✅ Realtime updates
   - ✅ Métricas reales
   - ✅ Validación de QR

2. **Media prioridad:**
   - CRUD de menú completo
   - Exportación de reportes
   - Tests E2E básicos

3. **Baja prioridad (polish):**
   - Push notifications
   - Panel superadmin completo
   - Mejoras de UI/UX

---

## 🎯 Objetivo Final

Tener un MVP funcional con:
- ✅ Estudiantes pueden ordenar y pagar
- ✅ Restaurantes reciben y gestionan pedidos
- ✅ UPIC cobra comisión automáticamente
- ✅ Sistema anti-filas funciona
- ✅ Métricas en tiempo real

**¿Cuál quieres implementar primero? Te puedo ayudar con el código específico.**

