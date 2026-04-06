# 🚀 Pasos Rápidos para Probar el Sistema

## ⚡ PASO 1: Ejecutar Migración SQL (OBLIGATORIO)

### Opción A: Desde Supabase Dashboard (Más Fácil) ⭐

1. **Abre Supabase Dashboard:**
   - Ve a https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Abre SQL Editor:**
   - Click en "SQL Editor" en el menú lateral
   - Click en "New query"

3. **Copia el SQL de migración:**
   - Abre el archivo `MIGRATION-SQL.sql` en tu editor
   - Copia **SOLO** desde la línea **355** hasta el final (sección de Reviews y Coupons)
   - O copia todo el contenido si prefieres

4. **Pega y ejecuta:**
   - Pega el SQL en el editor de Supabase
   - Click en "Run" o presiona `Ctrl+Enter`
   - Espera a que termine (debería tomar unos segundos)

5. **Verifica:**
   - Deberías ver mensajes de éxito
   - Si hay errores, revisa que las tablas no existan ya

### Opción B: Desde Terminal (Si tienes psql instalado)

```bash
# Conectarte y ejecutar SQL
psql $DATABASE_URL -f MIGRATION-SQL.sql
```

---

## ⚡ PASO 2: Verificar que Funcionó

Ejecuta el script de verificación:

```bash
node scripts/verificar-implementacion.js
```

**Deberías ver:**

```
✅ Tabla "Review" existe
✅ Tabla "Coupon" existe
✅ Tabla "CouponRedemption" existe
✅ Columna "Restaurant.averageRating" existe
✅ Columna "Restaurant.reviewCount" existe
✅ Columna "Order.couponId" existe
✅ Columna "Order.discountAmount" existe
✅ Enum "DiscountType" existe
```

Si ves ❌, vuelve al Paso 1.

---

## ⚡ PASO 3: Iniciar el Servidor

```bash
pnpm dev
```

Abre http://localhost:3000 en tu navegador.

---

## 🧪 PRUEBAS RÁPIDAS

### Prueba 1: Crear un Cupón (2 minutos)

1. **Inicia sesión como admin de restaurante**
2. **Ve a:** http://localhost:3000/admin/coupons
3. **Click en:** "Nuevo Cupón"
4. **Llena el formulario:**
   - Código: `PRUEBA10`
   - Tipo: Porcentaje
   - Valor: `10`
   - Válido desde: Hoy
   - Válido hasta: En 30 días
5. **Click en:** "Guardar"

**✅ Deberías ver:**

- El cupón aparece en la lista
- Las estadísticas se actualizan
- Card "Total Cupones" muestra 1

---

### Prueba 2: Aplicar Cupón en Checkout (3 minutos)

1. **Inicia sesión como estudiante**
2. **Agrega productos al carrito** (ve a cualquier restaurante)
3. **Ve a checkout**
4. **En la sección de cupón:**
   - Ingresa: `PRUEBA10`
   - Click en "Aplicar"
5. **Verifica:**
   - Aparece mensaje verde "Cupón aplicado"
   - Se muestra el descuento
   - El total se actualiza

**✅ Deberías ver:**

- Descuento aplicado correctamente
- Total reducido

---

### Prueba 3: Crear Reseña (5 minutos)

**Nota:** Necesitas un pedido en estado `delivered`

**Opción A: Cambiar estado manualmente**

1. Ve a `/admin/orders` como admin
2. Cambia un pedido a estado "Entregado"
3. Ve a `/orders/[id]/receipt` como estudiante
4. Deberías ver la sección de reseñas

**Opción B: Crear pedido y cambiar estado**

1. Haz un pedido completo
2. Como admin, cambia el estado a "Entregado"
3. Como estudiante, ve al comprobante
4. Crea la reseña

**✅ Deberías ver:**

- Sección "Califica tu experiencia"
- Botones para seleccionar restaurante o productos
- Formulario de reseña funcional
- Mensaje de éxito al enviar

---

### Prueba 4: Ver Reseñas en Restaurante (1 minuto)

1. **Ve a cualquier página de restaurante**
2. **Si hay reseñas, deberías ver:**
   - Rating promedio en el header (arriba a la derecha)
   - Sección "Reseñas" debajo del menú
   - Solo estrellas (sin comentarios)

**✅ Deberías ver:**

- Solo calificaciones visibles públicamente
- Sin comentarios ni información de usuarios

---

### Prueba 5: Panel de Reseñas Admin (2 minutos)

1. **Ve a:** http://localhost:3000/admin/reviews
2. **Verifica:**
   - Cards con estadísticas
   - Distribución de calificaciones
   - Lista de reseñas completas (con comentarios)
3. **Prueba búsqueda:**
   - Escribe algo en el buscador
   - Los resultados se filtran
4. **Prueba filtros:**
   - Click en una barra de distribución
   - Las reseñas se filtran por rating
5. **Prueba exportar:**
   - Click en "Exportar CSV"
   - Se descarga un archivo CSV

**✅ Deberías ver:**

- Admin ve comentarios completos
- Búsqueda y filtros funcionan
- CSV se descarga correctamente

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Error: "Cannot find module '@prisma/client'"

```bash
pnpm install
pnpm prisma generate
```

### Error: "Table Review does not exist"

**Solución:** Ejecuta la migración SQL (Paso 1)

### Error: "Cupón no encontrado"

**Solución:** Verifica que el código esté en mayúsculas y sea exacto

### Las reseñas no aparecen

**Solución:** Verifica que `reviewCount > 0` en la base de datos:

```sql
SELECT name, "reviewCount", "averageRating"
FROM "Restaurant"
WHERE "reviewCount" > 0;
```

### El servidor no inicia

```bash
# Limpia cache y reinstala
rm -rf .next node_modules
pnpm install
pnpm dev
```

---

## ✅ CHECKLIST RÁPIDO

- [ ] Migración SQL ejecutada
- [ ] Script de verificación muestra todo ✅
- [ ] Servidor corriendo (`pnpm dev`)
- [ ] Puedo crear cupones
- [ ] Puedo aplicar cupones en checkout
- [ ] Puedo crear reseñas
- [ ] Veo reseñas en página del restaurante
- [ ] Panel de reseñas admin funciona
- [ ] Búsqueda y filtros funcionan
- [ ] Exportar CSV funciona

---

## 📞 SIGUIENTE PASO

Una vez que hayas ejecutado la migración SQL y verificado que todo funciona, puedes:

1. **Probar el flujo completo:**
   - Crear pedido → Aplicar cupón → Pagar → Entregar → Crear reseña

2. **Probar edge cases:**
   - Cupón expirado
   - Cupón agotado
   - Pedido menor al mínimo
   - Múltiples reseñas del mismo pedido

3. **Revisar en base de datos:**
   - Ver que los datos se guardan correctamente
   - Verificar que los ratings se actualizan

---

**¡Empieza con el Paso 1 (Migración SQL) y luego sigue probando!** 🚀
