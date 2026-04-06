# Próximos Pasos - Sistema de Menú Híbrido

## ✅ Completado

1. ✅ Schema de base de datos actualizado (campos POS)
2. ✅ MenuSyncService implementado
3. ✅ Método `getMenu()` en conectores POS
4. ✅ Endpoints API para importar/sincronizar menú
5. ✅ UI Admin con botones de importación
6. ✅ Campo `displayName` en formulario de productos
7. ✅ Indicadores visuales para productos del POS
8. ✅ Envío de pedidos con `posItemId`
9. ✅ Endpoints actualizados para manejar `displayName`

## 🔄 Próximos Pasos Recomendados

### 1. Aplicar Migración de Base de Datos (PRIORITARIO)

```bash
# Ejecutar la migración SQL
psql -U tu_usuario -d tu_base_de_datos -f migration_add_menu_pos_fields.sql
```

O si usas Prisma:

```bash
npx prisma db push
# O
npx prisma migrate dev --name add_menu_pos_fields
```

**Importante**: Verificar que los campos se agregaron correctamente antes de continuar.

### 2. Probar Flujo Completo

#### 2.1 Configurar POS

1. Ir a `/admin/settings`
2. Habilitar integración POS
3. Seleccionar tipo de POS (ej: Loyverse)
4. Ingresar credenciales
5. Probar conexión

#### 2.2 Importar Menú

1. Ir a `/admin/menu`
2. Click en "Importar desde POS"
3. Verificar que se importen categorías y productos
4. Verificar que se guarden `posItemId` y `posCategoryId`

#### 2.3 Personalizar Visualmente

1. Editar un producto importado
2. Agregar `displayName` (nombre comercial)
3. Cambiar imagen
4. Reordenar productos
5. Verificar que las personalizaciones se guarden

#### 2.4 Re-sincronizar

1. Hacer cambios en el POS (precio, nombre)
2. Click en "Re-sincronizar" en `/admin/menu`
3. Verificar que:
   - Precios se actualicen
   - Nombres base se actualicen
   - Personalizaciones visuales se preserven

#### 2.5 Probar Envío de Pedidos

1. Crear un pedido con productos importados del POS
2. Verificar que el pedido incluya `posItemId`
3. Verificar que el pedido se envíe correctamente al POS

### 3. Mejoras Opcionales

#### 3.1 Sincronización Automática Programada

Crear un cron job o tarea programada para sincronizar menús periódicamente:

```typescript
// src/lib/cron/menuSync.ts
export async function syncAllRestaurantMenus() {
  const restaurants = await prisma.restaurant.findMany({
    where: {
      posEnabled: true,
      posType: { not: null },
    },
  });

  for (const restaurant of restaurants) {
    try {
      await resyncMenuFromPOS(restaurant.id);
    } catch (error) {
      logger.error(
        { restaurantId: restaurant.id, error },
        'Error en sincronización automática'
      );
    }
  }
}
```

#### 3.2 Notificaciones de Cambios

Alertar al admin cuando:

- Precios cambien en el POS
- Productos se desactiven en el POS
- Nuevos productos se agreguen al POS

#### 3.3 Historial de Sincronizaciones

Crear tabla para guardar historial:

```sql
CREATE TABLE "MenuSyncHistory" (
  id TEXT PRIMARY KEY,
  restaurantId TEXT NOT NULL,
  syncedAt TIMESTAMP NOT NULL,
  importedCategories INTEGER DEFAULT 0,
  importedProducts INTEGER DEFAULT 0,
  updatedCategories INTEGER DEFAULT 0,
  updatedProducts INTEGER DEFAULT 0,
  errors JSONB,
  FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"(id)
);
```

#### 3.4 Validación de Datos POS

Agregar validaciones antes de importar:

- Verificar que todos los productos tengan categoría válida
- Verificar que los precios sean números válidos
- Verificar que no haya IDs duplicados

#### 3.5 UI Mejorada

- Mostrar última fecha de sincronización
- Mostrar diferencias entre precio POS y precio actual
- Permitir sincronización selectiva (solo precios, solo inventario, etc.)
- Mostrar productos que necesitan atención (precios desactualizados, etc.)

### 4. Documentación Adicional

#### 4.1 Guía de Usuario

Crear guía paso a paso para restaurantes:

- Cómo configurar POS
- Cómo importar menú
- Cómo personalizar visualmente
- Cómo re-sincronizar

#### 4.2 Guía Técnica para Desarrolladores

- Cómo agregar soporte para nuevo POS
- Cómo extender el sistema
- Troubleshooting común

### 5. Testing

#### 5.1 Tests Unitarios

- MenuSyncService
- Transformación de datos POS
- Preservación de personalizaciones

#### 5.2 Tests de Integración

- Flujo completo de importación
- Flujo de re-sincronización
- Envío de pedidos con posItemId

#### 5.3 Tests E2E

- Configurar POS → Importar → Personalizar → Re-sincronizar

### 6. Optimizaciones

#### 6.1 Performance

- Lazy loading de productos
- Paginación en importación de menús grandes
- Cache de configuración POS

#### 6.2 Manejo de Errores

- Reintentos automáticos en sincronización
- Cola de trabajos para sincronizaciones fallidas
- Alertas proactivas de errores

## 🚨 Checklist Pre-Producción

Antes de desplegar a producción:

- [ ] Migración de base de datos aplicada
- [ ] Endpoints probados con datos reales
- [ ] UI probada en diferentes navegadores
- [ ] Manejo de errores robusto
- [ ] Logs implementados
- [ ] Documentación actualizada
- [ ] Backup de base de datos antes de migración
- [ ] Plan de rollback preparado

## 📝 Notas Importantes

1. **Nunca eliminar `posItemId`**: Es crítico para el envío de pedidos
2. **Preservar personalizaciones**: El sistema está diseñado para no sobrescribir `displayName`, imágenes, orden, etc.
3. **Sincronización no destructiva**: Siempre preserva datos existentes
4. **Fallback**: Si no hay `posItemId`, el sistema usa el nombre como fallback

## 🎯 Prioridad de Implementación

1. **ALTA**: Aplicar migración y probar flujo completo
2. **MEDIA**: Sincronización automática programada
3. **MEDIA**: Notificaciones de cambios
4. **BAJA**: Historial de sincronizaciones
5. **BAJA**: UI mejorada con más detalles

---

**Última actualización**: Enero 2024
