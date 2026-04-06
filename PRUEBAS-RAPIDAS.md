# ⚡ Pruebas Rápidas - Sistema de Reseñas y Cupones

**Estado:** ✅ Migración completada - Listo para probar

---

## 🚀 INICIO RÁPIDO

### 1. Iniciar Servidor

```bash
pnpm dev
```

Abre http://localhost:3000

---

## 🧪 PRUEBAS EN 5 MINUTOS

### Prueba 1: Crear Cupón (1 minuto)

1. **Inicia sesión como `restaurant_admin`**
2. **Ve a:** http://localhost:3000/admin/coupons
3. **Click:** "Nuevo Cupón"
4. **Llena:**
   - Código: `PRUEBA10`
   - Tipo: Porcentaje
   - Valor: `10`
   - Válido desde: Hoy
   - Válido hasta: En 30 días
5. **Click:** "Guardar"

**✅ Deberías ver:**

- El cupón en la lista
- Estadísticas actualizadas (Total Cupones: 1)

---

### Prueba 2: Aplicar Cupón (2 minutos)

1. **Inicia sesión como estudiante**
2. **Agrega productos al carrito** (ve a cualquier restaurante)
3. **Ve a checkout**
4. **En la sección de cupón:**
   - Ingresa: `PRUEBA10`
   - Click "Aplicar"
5. **Verifica:**
   - Mensaje verde "Cupón aplicado"
   - Descuento visible
   - Total actualizado

**✅ Deberías ver:**

- Descuento del 10% aplicado
- Total reducido correctamente

---

### Prueba 3: Crear Reseña (2 minutos)

**Opción A: Cambiar estado manualmente**

1. Como admin, ve a `/admin/orders`
2. Cambia un pedido a estado "Entregado"
3. Como estudiante, ve a `/orders/[id]/receipt`
4. Deberías ver la sección "Califica tu experiencia"

**Opción B: Crear pedido completo**

1. Haz un pedido completo
2. Como admin, cambia estado a "Entregado"
3. Como estudiante, ve al comprobante
4. Crea la reseña

**Qué probar:**

- ✅ Seleccionar "Restaurante completo" o producto específico
- ✅ Seleccionar rating (1-5 estrellas)
- ✅ Escribir comentario opcional
- ✅ Enviar reseña
- ✅ Ver mensaje de éxito

**✅ Deberías ver:**

- Reseña creada exitosamente
- Mensaje "¡Gracias por tu reseña!"

---

### Prueba 4: Ver Reseñas Públicas (30 segundos)

1. **Ve a cualquier página de restaurante**
2. **Si hay reseñas, deberías ver:**
   - Rating promedio en el header (arriba a la derecha)
   - Sección "Reseñas" debajo del menú
   - Solo estrellas (sin comentarios)

**✅ Deberías ver:**

- Solo calificaciones visibles
- Sin comentarios ni información de usuarios

---

### Prueba 5: Panel de Reseñas Admin (1 minuto)

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

## ✅ CHECKLIST DE PRUEBAS

- [ ] Puedo crear cupones desde admin
- [ ] Puedo aplicar cupones en checkout
- [ ] El descuento se calcula correctamente
- [ ] Puedo crear reseñas desde pedidos entregados
- [ ] Las reseñas aparecen en página del restaurante (solo estrellas)
- [ ] El admin puede ver reseñas completas con comentarios
- [ ] La búsqueda funciona en panel de reseñas
- [ ] Los filtros funcionan
- [ ] La exportación CSV funciona
- [ ] La paginación funciona

---

## 🐛 SI ALGO NO FUNCIONA

### Error: "Cannot find module '@prisma/client'"

```bash
pnpm prisma generate
```

### Error: "Table Review does not exist"

- Verifica que ejecutaste la migración SQL
- Ejecuta: `node scripts/verificar-implementacion.js`

### Las reseñas no aparecen

- Verifica que `reviewCount > 0` en la base de datos
- Crea al menos una reseña primero

### El cupón no se aplica

- Verifica que el código esté en mayúsculas
- Verifica que el cupón esté activo y vigente
- Verifica que el pedido cumpla el mínimo requerido

---

**¡Empieza con Prueba 1 y sigue en orden!** 🚀
