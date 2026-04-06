# Migración: Agregar SavedPaymentMethod y Favorite

## Instrucciones

Esta migración agrega dos nuevas tablas:

1. **SavedPaymentMethod** - Para guardar métodos de pago preferidos del usuario
2. **Favorite** - Para guardar favoritos (restaurantes y productos)

## Opción 1: Ejecutar SQL manualmente en Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Ve a **SQL Editor**
3. Copia y pega el contenido de `MIGRATION-SQL.sql`
4. Ejecuta el SQL

## Opción 2: Usar Prisma Migrate (cuando la BD esté disponible)

```bash
pnpm prisma migrate deploy
```

O si prefieres crear la migración:

```bash
pnpm prisma migrate dev --name add_saved_payment_methods_and_favorites
```

## Opción 3: Usar Prisma DB Push (desarrollo)

```bash
pnpm prisma db push
```

## Verificar que funcionó

Después de ejecutar la migración, verifica que las tablas se crearon:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('SavedPaymentMethod', 'Favorite');
```

## Notas

- El enum `FavoriteType` se crea automáticamente
- Los índices se crean para mejorar el rendimiento
- Las foreign keys tienen `ON DELETE CASCADE` para mantener la integridad
- El trigger `updatedAt` se actualiza automáticamente en `SavedPaymentMethod`

