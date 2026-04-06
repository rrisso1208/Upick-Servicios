# 📋 Instrucciones para Completar las Mejoras

**Fecha:** Diciembre 2024

---

## ✅ MEJORAS COMPLETADAS

### 1. **Testing Básico** ✅

- ✅ Tests unitarios para Orders API (`tests/unit/orders.test.ts`)
- ✅ Tests unitarios para Auth API (`tests/unit/auth.test.ts`)
- ✅ Configuración de Vitest lista

**Para ejecutar:**

```bash
pnpm test
```

### 2. **Optimización de Performance (SWR)** ✅

- ✅ Hook personalizado `useSWRWithAuth` creado
- ✅ Hook `useProducts` creado
- ✅ Hook `useCategories` creado
- ✅ SWRConfig agregado al layout principal

**Para usar en componentes:**

```typescript
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';

function MyComponent() {
  const { products, isLoading, mutate } = useProducts();
  const { categories } = useCategories();

  // Los datos se cachean automáticamente
  // mutate() para forzar actualización después de cambios
}
```

### 3. **Monitoreo con Sentry** ✅

- ✅ Configuración de Sentry creada (client, server, edge)
- ✅ Filtrado de datos sensibles implementado
- ✅ Session replay configurado

---

## 🔧 CONFIGURACIÓN PENDIENTE

### **1. Completar Configuración de Sentry**

#### Paso 1: Crear cuenta en Sentry

1. Ve a https://sentry.io/signup/
2. Crea una cuenta o inicia sesión
3. Crea un nuevo proyecto "Next.js"

#### Paso 2: Obtener DSN

1. En el dashboard de Sentry, ve a Settings > Projects > [Tu Proyecto]
2. Copia el "DSN" (Data Source Name)

#### Paso 3: Agregar variables de entorno

Agrega a tu archivo `.env` y a Vercel:

```env
NEXT_PUBLIC_SENTRY_DSN=tu_dsn_aqui
NEXT_PUBLIC_SENTRY_ENABLE_DEV=false  # true para desarrollo
```

#### Paso 4: Ejecutar wizard de Sentry (Opcional pero recomendado)

```bash
npx @sentry/wizard@latest -i nextjs
```

Esto configurará automáticamente:

- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `next.config.js` (con Sentry plugin)
- `sentry.properties` (para releases)

#### Paso 5: Verificar funcionamiento

1. Agrega un error de prueba en algún componente:

```typescript
throw new Error('Test Sentry error');
```

2. Verifica que el error aparezca en el dashboard de Sentry

---

### **2. Refactorizar Admin Menu para Usar SWR**

#### Archivo: `src/app/admin/menu/page.tsx`

**Cambios necesarios:**

1. **Reemplazar `useState` y `useEffect` por hooks SWR:**

```typescript
// ANTES:
const [products, setProducts] = useState<Product[]>([]);
const [categories, setCategories] = useState<Category[]>([]);

useEffect(() => {
  fetchProducts();
  fetchCategories();
}, []);

// DESPUÉS:
import { useProducts } from '../../../hooks/useProducts';
import { useCategories } from '../../../hooks/useCategories';

const {
  products,
  isLoading: productsLoading,
  mutate: mutateProducts,
} = useProducts();
const {
  categories,
  isLoading: categoriesLoading,
  mutate: mutateCategories,
} = useCategories();
```

2. **Actualizar funciones que modifican datos:**

```typescript
// Después de crear/actualizar/eliminar, llamar mutate() para revalidar
const handleSubmitProduct = async () => {
  // ... código de creación/actualización ...

  // Revalidar cache
  mutateProducts();
  mutateCategories();
};
```

3. **Eliminar funciones `fetchProducts` y `fetchCategories`** (ya no son necesarias)

**Beneficios:**

- ⚡ Menos código
- ⚡ Cache automático
- ⚡ Revalidación automática
- ⚡ Mejor performance

---

### **3. Optimizar Imágenes**

#### Archivos a modificar:

- `src/app/page.tsx` (universidades)
- `src/app/[universitySlug]/page.tsx` (restaurantes)
- `src/app/admin/menu/page.tsx` (productos)
- `src/components/ui/ProductCard.tsx`

#### Cambios:

```typescript
// ANTES:
<Image
  src={imageUrl}
  alt={name}
  unoptimized  // ❌ Remover esto
/>

// DESPUÉS:
<Image
  src={imageUrl}
  alt={name}
  width={400}
  height={300}
  quality={85}
  loading="lazy"
  placeholder="blur"
  blurDataURL={blurDataUrl}  // Opcional: generar blur placeholder
/>
```

**Para generar blur placeholders:**

```bash
pnpm add plaiceholder
```

---

### **4. Agregar Paginación**

#### Crear hook: `src/hooks/usePaginatedProducts.ts`

```typescript
import { useSWRWithAuth } from './useSWRWithAuth';

export function usePaginatedProducts(page: number = 1, limit: number = 20) {
  const { data, error, isLoading, mutate } = useSWRWithAuth(
    `/api/admin/products?page=${page}&limit=${limit}`
  );

  return {
    products: data?.data?.products || [],
    totalPages: data?.data?.totalPages || 0,
    isLoading,
    isError: error,
    mutate,
  };
}
```

#### Modificar API: `src/app/api/admin/products/route.ts`

```typescript
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      // ... query con skip y take
      skip,
      take: limit,
    }),
    prisma.product.count(),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    },
  });
}
```

---

## 📊 PROGRESO ACTUAL

| Mejora                | Estado | Completitud |
| --------------------- | ------ | ----------- |
| Testing Básico        | ✅     | 40%         |
| SWR Hooks             | ✅     | 100%        |
| Refactor Admin Menu   | ⏳     | 0%          |
| Optimización Imágenes | ⏳     | 0%          |
| Paginación            | ⏳     | 0%          |
| Sentry Config         | ✅     | 80%         |
| Sentry Setup          | ⏳     | 0%          |

**Progreso Total: ~45%** 🎯

---

## 🎯 PRÓXIMOS PASOS RECOMENDADOS

### **Prioridad Alta (Esta Semana):**

1. ✅ Completar configuración de Sentry (30 min)
2. ✅ Refactorizar admin menu para usar SWR (2-3 horas)
3. ✅ Optimizar imágenes (1 hora)

### **Prioridad Media (Próxima Semana):**

4. ⏳ Implementar paginación (2-3 horas)
5. ⏳ Agregar más tests (4-5 horas)
6. ⏳ Sistema de reseñas (1 semana)

---

## 📝 NOTAS IMPORTANTES

### **SWR:**

- Los hooks ya están creados y listos para usar
- Solo falta refactorizar los componentes existentes
- El cache es automático y transparente

### **Sentry:**

- La configuración está lista
- Solo falta agregar el DSN y ejecutar el wizard
- No afecta el funcionamiento si no está configurado

### **Testing:**

- Los tests básicos están creados
- Se pueden ejecutar con `pnpm test`
- Se pueden agregar más tests gradualmente

---

## 🚀 COMANDOS ÚTILES

```bash
# Ejecutar tests
pnpm test

# Ejecutar tests en modo watch
pnpm test --watch

# Ejecutar tests con UI
pnpm test:ui

# Ejecutar tests E2E
pnpm test:e2e

# Verificar tipos
pnpm type-check

# Linting
pnpm lint
```

---

**Última actualización:** Diciembre 2024
