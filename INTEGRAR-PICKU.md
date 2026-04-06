# 🦘 Guía para Integrar Picku en la Web

## 📁 Estructura de Archivos

He creado la estructura para integrar a Picku. Ahora necesitas agregar las imágenes.

### Carpeta de Imágenes

Crea/coloca las imágenes de Picku en:

```
public/picku/
```

### Nombres de Archivos Necesarios

Basándote en las imágenes que me enviaste, necesitas estos archivos:

1. **`picku-logo.png`** - Logo/app icon (cabeza de Picku con fondo rojo)
   - Para: Header, favicon, app icon
   - Tamaño recomendado: 512x512px o más

2. **`picku-ready.png`** - Picku con bolsa y teléfono QR
   - Texto: "¡Picku, pedido listo!"
   - Para: Cuando el pedido está listo

3. **`picku-complete.png`** - Picku con pulgar arriba y check verde
   - Texto: "¡Orden Completa!"
   - Para: Confirmación de pago exitoso

4. **`picku-thinking.png`** - Picku pensando con bombilla
   - Texto: "Picku, Pensando en Tu Elección"
   - Para: Empty states, búsquedas sin resultados

5. **`picku-jumping.png`** - Picku saltando con QR y bolsa
   - Texto: "¡Salta la espera!"
   - Para: Página de inicio, mensajes motivacionales

6. **`picku-waving.png`** - Picku saludando con bolsa
   - Texto: "¡Picku, a Saltar!"
   - Para: Empty states de pedidos

7. **`picku-pointing.png`** - Picku apuntando a QR
   - Para: Instrucciones de uso

8. **`picku-chef.png`** - Picku con sombrero de chef
   - Texto: "¡Picku Chef está listo para cocinar!"
   - Para: Página de restaurantes

9. **`picku-default.png`** - Versión genérica de Picku
   - Para: Uso general

## ✅ Componentes Creados

### 1. `PickuMascot` Component

Ubicación: `src/components/ui/PickuMascot.tsx`

**Uso:**

```tsx
import { PickuMascot } from '@/components/ui/PickuMascot';

// Versión básica
<PickuMascot />

// Con variante específica
<PickuMascot variant="ready" size="lg" showText />

// Variantes disponibles:
// - 'default' | 'ready' | 'complete' | 'thinking' | 'jumping' | 'waving' | 'pointing' | 'chef' | 'logo'
// Tamaños: 'sm' | 'md' | 'lg' | 'xl'
```

### 2. `EmptyState` Component

Ubicación: `src/components/ui/EmptyState.tsx`

**Uso:**

```tsx
import { EmptyState } from '@/components/ui/EmptyState';

<EmptyState
  title="No tienes pedidos aún"
  description="Explora los restaurantes y haz tu primer pedido"
  actionLabel="Explorar Restaurantes"
  onAction={() => router.push('/')}
  variant="orders"
/>;
```

## 🎨 Lugares Donde Picku Ya Está Integrado

### ✅ Header

- Logo de Picku junto al nombre "Upick"
- Aparece en todas las páginas

### ✅ Página 404

- Picku pensando con mensaje "¡Ups! Página no encontrada"

### ✅ Mis Pedidos (Empty State)

- Picku saludando cuando no hay pedidos
- Texto: "¡Aún no tienes pedidos!"

### ✅ Resultado de Pago

- Picku con check verde cuando el pago es exitoso
- Texto: "¡Orden Completa!"

### ✅ Recibo de Pedido

- Picku aparece cuando el pedido está listo
- Texto: "¡Picku, pedido listo!"

### ✅ Página de Restaurantes

- Picku chef al lado del título "Restaurantes"
- Variante: `chef` con sombrero de chef

## 📝 Pasos para Completar la Integración

### Paso 1: Agregar las Imágenes

1. Guarda todas las imágenes de Picku en formato PNG
2. Colócalas en la carpeta `public/picku/`
3. Nómbralas según la lista de arriba

**Estructura final:**

```
public/
  └── picku/
      ├── picku-logo.png
      ├── picku-ready.png
      ├── picku-complete.png
      ├── picku-thinking.png
      ├── picku-jumping.png
      ├── picku-waving.png
      ├── picku-pointing.png
      ├── picku-chef.png
      └── picku-default.png
```

### Paso 2: Verificar que Funcionen

Después de agregar las imágenes, verifica que:

- El logo aparece en el header
- Los empty states muestran a Picku
- Las páginas de éxito muestran a Picku

### Paso 3: Personalizar (Opcional)

Puedes ajustar los textos y variantes en:

- `src/components/ui/PickuMascot.tsx` - Textos por defecto
- `src/components/ui/EmptyState.tsx` - Mensajes de empty states

## 🎯 Próximos Lugares para Integrar Picku

### Sugerencias adicionales:

1. **Página de Inicio**
   - Picku saltando con mensaje "¡Salta la espera!"

2. **Loading States**
   - Picku animado mientras carga

3. **Mensajes de Éxito**
   - Picku celebrando cuando se completa una acción

4. **Onboarding**
   - Picku guiando a nuevos usuarios

5. **Favoritos (Empty State)**
   - Picku pensando cuando no hay favoritos

## 💡 Tips

- **Formatos:** PNG con fondo transparente funciona mejor
- **Tamaños:** Mínimo 512x512px para buena calidad
- **Optimización:** Next.js optimiza automáticamente las imágenes
- **Performance:** Las imágenes se cargan bajo demanda (lazy loading)

## 🚀 Después de Agregar las Imágenes

Una vez que agregues las imágenes:

1. Haz commit de los archivos
2. Push a GitHub
3. Vercel desplegará automáticamente
4. ¡Picku aparecerá en toda la web!

¿Necesitas ayuda con algún otro lugar para integrar a Picku?
