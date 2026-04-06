# 🧪 Guía de Pruebas - Sistema de Reseñas y Cupones

**Fecha:** Diciembre 2024

---

## 📋 PREPARACIÓN

### 1. Ejecutar Migración SQL

**Opción A: Desde Supabase Dashboard (Recomendado)**

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a **SQL Editor**
3. Abre el archivo `MIGRATION-SQL.sql`
4. Copia y pega el contenido desde la línea 355 hasta el final (sección de Reviews y Coupons)
5. Ejecuta el script
6. Verifica que no haya errores

**Opción B: Desde terminal (si tienes acceso)**

```bash
# Conectarte a la base de datos y ejecutar el SQL
psql $DATABASE_URL -f MIGRATION-SQL.sql
```

### 2. Generar Tipos de Prisma

```bash
pnpm prisma generate
```

Esto actualizará los tipos TypeScript con los nuevos modelos `Review`, `Coupon`, y `CouponRedemption`.

### 3. Verificar que el servidor esté corriendo

```bash
pnpm dev
```

---

## 🧪 PRUEBAS DEL SISTEMA DE RESEÑAS

### Prueba 1: Crear Reseña desde Pedido Completado

**Pasos:**

1. Inicia sesión como estudiante (`student` role)
2. Haz un pedido completo (agregar productos al carrito → checkout → pagar)
3. Espera a que el pedido cambie a estado `delivered` (o cambia manualmente desde admin)
4. Ve a `/orders/[id]/receipt` del pedido entregado
5. Deberías ver la sección "Califica tu experiencia"

**Qué probar:**

- ✅ Aparece botón "Restaurante completo"
- ✅ Aparecen botones para cada producto del pedido
- ✅ Al seleccionar una opción, aparece el formulario de reseña
- ✅ Puedes seleccionar rating (1-5 estrellas)
- ✅ Puedes escribir un comentario opcional
- ✅ Al enviar, muestra mensaje de éxito
- ✅ Si ya existe reseña, muestra la reseña existente

**Resultado esperado:**

- Reseña creada exitosamente
- Rating promedio del restaurante actualizado
- Review count incrementado

---

### Prueba 2: Ver Reseñas en Página del Restaurante

**Pasos:**

1. Ve a cualquier página de restaurante: `/[universitySlug]/[restaurantSlug]`
2. Si el restaurante tiene reseñas, deberías ver:
   - Rating promedio en el header (arriba a la derecha)
   - Sección "Reseñas" debajo del menú

**Qué probar:**

- ✅ Rating promedio visible con estrellas
- ✅ Contador de reseñas visible
- ✅ Lista de reseñas muestra solo estrellas (sin comentarios)
- ✅ Paginación funciona si hay más de 10 reseñas
- ✅ Si no hay reseñas, no aparece la sección

**Resultado esperado:**

- Solo se ven calificaciones (estrellas)
- No se ven comentarios ni información del usuario
- Paginación funciona correctamente

---

### Prueba 3: Panel de Reseñas Admin

**Pasos:**

1. Inicia sesión como `restaurant_admin`
2. Ve a `/admin/reviews`
3. Deberías ver:
   - Cards con estadísticas (promedio, total, con comentarios)
   - Distribución de calificaciones
   - Lista de reseñas completas

**Qué probar:**

**Búsqueda:**

- ✅ Buscar por texto en comentarios
- ✅ Buscar por email de usuario
- ✅ Buscar por nombre de producto
- ✅ Resultados se filtran en tiempo real

**Filtros:**

- ✅ Click en distribución de ratings filtra reseñas
- ✅ Botón "Limpiar filtros" resetea todo
- ✅ Contador muestra cantidad filtrada

**Exportar:**

- ✅ Botón "Exportar CSV" descarga archivo
- ✅ CSV contiene todas las reseñas filtradas
- ✅ Formato correcto (fecha, usuario, rating, comentario)

**Paginación:**

- ✅ Si hay más de 10 reseñas, aparece paginación
- ✅ Navegación entre páginas funciona
- ✅ Muestra rango correcto (ej: "Mostrando 1-10 de 25")

**Resultado esperado:**

- Admin ve todas las reseñas con comentarios completos
- Búsqueda y filtros funcionan correctamente
- Exportación genera CSV válido

---

## 🎟️ PRUEBAS DEL SISTEMA DE CUPONES

### Prueba 4: Crear Cupón desde Admin

**Pasos:**

1. Inicia sesión como `restaurant_admin`
2. Ve a `/admin/coupons`
3. Click en "Nuevo Cupón"
4. Llena el formulario:
   - Código: `TEST10`
   - Tipo: Porcentaje
   - Valor: `10`
   - Pedido mínimo: `20000` (opcional)
   - Máx usos: `100` (opcional)
   - Válido desde: Hoy
   - Válido hasta: En 30 días

**Qué probar:**

- ✅ Formulario valida código único
- ✅ Valida que fecha fin > fecha inicio
- ✅ Valida porcentaje no mayor a 100%
- ✅ Guarda cupón exitosamente
- ✅ Aparece en la lista de cupones

**Resultado esperado:**

- Cupón creado y visible en la lista
- Estadísticas se actualizan

---

### Prueba 5: Aplicar Cupón en Checkout

**Pasos:**

1. Inicia sesión como estudiante
2. Agrega productos al carrito
3. Ve a checkout
4. En la sección "¿Tienes un cupón de descuento?"
5. Ingresa el código del cupón creado
6. Click en "Aplicar"

**Qué probar:**

**Cupón válido:**

- ✅ Muestra mensaje de éxito
- ✅ Muestra descuento aplicado
- ✅ Total se actualiza con descuento
- ✅ Botón para remover cupón funciona

**Cupón inválido:**

- ✅ Código incorrecto → Error "Cupón no encontrado"
- ✅ Cupón expirado → Error "Cupón fuera de vigencia"
- ✅ Pedido menor al mínimo → Error con monto mínimo
- ✅ Cupón agotado → Error "Cupón agotado"

**Crear pedido con cupón:**

- ✅ Al crear pedido, el cupón se aplica
- ✅ `discountAmount` se guarda en la orden
- ✅ `couponId` se guarda en la orden
- ✅ Contador de usos del cupón se incrementa

**Resultado esperado:**

- Cupón se aplica correctamente
- Descuento se calcula y muestra
- Pedido se crea con cupón aplicado

---

### Prueba 6: Estadísticas de Cupones

**Pasos:**

1. Ve a `/admin/coupons`
2. Crea varios cupones con diferentes estados:
   - Cupón activo y vigente
   - Cupón activo pero expirado
   - Cupón inactivo
   - Cupón con usos

**Qué probar:**

- ✅ Card "Total Cupones" muestra cantidad correcta
- ✅ Card "Cupones Activos" solo cuenta activos y vigentes
- ✅ Card "Total Usados" suma todos los `usedCount`
- ✅ Card "Descuento Total" calcula estimación correcta
- ✅ Exportar CSV funciona y contiene todos los cupones

**Resultado esperado:**

- Estadísticas son precisas
- Cards se actualizan al crear/editar cupones

---

### Prueba 7: Gestión de Cupones

**Pasos:**

1. En `/admin/coupons`, prueba:
   - Editar cupón (cambiar fecha de fin)
   - Activar/desactivar cupón
   - Eliminar cupón

**Qué probar:**

- ✅ Editar cupón actualiza correctamente
- ✅ Activar/desactivar cambia estado visual
- ✅ Eliminar cupón lo remueve de la lista
- ✅ Paginación funciona si hay muchos cupones

**Resultado esperado:**

- CRUD completo funciona correctamente

---

## 🧪 PRUEBAS AUTOMATIZADAS

### Ejecutar Tests Unitarios

```bash
# Ejecutar todos los tests
pnpm test

# Ejecutar solo tests de reseñas
pnpm test reviews

# Ejecutar solo tests de cupones
pnpm test coupons

# Ejecutar con coverage
pnpm test --coverage
```

**Qué verificar:**

- ✅ Todos los tests pasan
- ✅ Coverage muestra porcentaje adecuado
- ✅ No hay errores de TypeScript

---

## 🔍 VERIFICACIÓN EN BASE DE DATOS

### Verificar Tablas Creadas

```sql
-- Verificar que las tablas existen
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('Review', 'Coupon', 'CouponRedemption');

-- Verificar columnas de Restaurant
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'Restaurant'
AND column_name IN ('averageRating', 'reviewCount');

-- Verificar columnas de Order
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'Order'
AND column_name IN ('couponId', 'discountAmount');
```

### Verificar Datos

```sql
-- Ver reseñas creadas
SELECT r.*, u.email, p.name as product_name
FROM "Review" r
LEFT JOIN "User" u ON r."userId" = u.id
LEFT JOIN "Product" p ON r."productId" = p.id
ORDER BY r."createdAt" DESC
LIMIT 10;

-- Ver cupones creados
SELECT code, "discountType", "discountValue", "usedCount", "isActive"
FROM "Coupon"
ORDER BY "createdAt" DESC;

-- Verificar ratings actualizados
SELECT name, "averageRating", "reviewCount"
FROM "Restaurant"
WHERE "reviewCount" > 0;
```

---

## 📊 CHECKLIST DE PRUEBAS

### Sistema de Reseñas

- [ ] Crear reseña desde pedido completado
- [ ] Ver reseñas en página del restaurante (solo estrellas)
- [ ] Ver reseñas completas en admin panel
- [ ] Búsqueda funciona en admin
- [ ] Filtros por rating funcionan
- [ ] Exportar CSV funciona
- [ ] Paginación funciona
- [ ] Rating promedio se actualiza correctamente

### Sistema de Cupones

- [ ] Crear cupón desde admin
- [ ] Aplicar cupón válido en checkout
- [ ] Validación de cupón inválido funciona
- [ ] Descuento se calcula correctamente
- [ ] Pedido se crea con cupón aplicado
- [ ] Estadísticas muestran datos correctos
- [ ] Editar cupón funciona
- [ ] Activar/desactivar cupón funciona
- [ ] Eliminar cupón funciona
- [ ] Exportar CSV funciona
- [ ] Paginación funciona

### Tests Automatizados

- [ ] Tests de reseñas pasan
- [ ] Tests de cupones pasan
- [ ] No hay errores de TypeScript
- [ ] No hay errores de linting

---

## 🐛 TROUBLESHOOTING

### Error: "Column Review does not exist"

**Solución:** Ejecuta la migración SQL completa

### Error: "Cannot find module '@prisma/client'"

**Solución:** Ejecuta `pnpm prisma generate`

### Error: "Review already exists"

**Solución:** Es normal, solo puedes crear una reseña por pedido

### Error: "Cupón no encontrado"

**Solución:** Verifica que el código esté en mayúsculas y sea exacto

### Error: "Cupón fuera de vigencia"

**Solución:** Verifica las fechas del cupón en admin panel

### Las reseñas no aparecen en la página del restaurante

**Solución:** Verifica que `reviewCount > 0` en la base de datos

---

## 📝 NOTAS IMPORTANTES

1. **Reseñas públicas:** Solo muestran estrellas, sin comentarios
2. **Reseñas admin:** Muestran todo (comentarios, usuarios, pedidos)
3. **Cupones:** Se validan en el servidor antes de aplicar
4. **Paginación:** 10 items por página en reseñas, 12 en cupones
5. **Exportación:** CSV se descarga automáticamente al hacer click

---

## ✅ CRITERIOS DE ÉXITO

El sistema está funcionando correctamente si:

1. ✅ Puedes crear reseñas desde pedidos completados
2. ✅ Las reseñas aparecen en la página del restaurante (solo estrellas)
3. ✅ El admin puede ver todas las reseñas con comentarios
4. ✅ Puedes crear y aplicar cupones
5. ✅ Los descuentos se calculan correctamente
6. ✅ Las estadísticas son precisas
7. ✅ La paginación funciona en todas las listas
8. ✅ La exportación CSV funciona
9. ✅ Todos los tests pasan

---

**¡Listo para probar!** 🚀

Sigue los pasos en orden y marca cada prueba como completada.
