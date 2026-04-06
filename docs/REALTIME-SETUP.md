# 🔄 Configuración de Supabase Realtime

Esta guía te ayudará a configurar Supabase Realtime para que los pedidos se actualicen en tiempo real en el panel de administración.

## 📋 Pasos para Habilitar Realtime

### 1. Ir a la Sección de Replication en Supabase

1. Abre tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. En el menú lateral izquierdo, haz clic en **"Database"**
3. Busca y haz clic en **"Replication"** (no "ETL Replication")
   - Si no ves "Replication", busca en **"Database"** → **"Publications"**

### 2. Habilitar Realtime para la Tabla Order

**Opción A: Desde SQL Editor (Recomendado)**

1. Ve a **SQL Editor** en el menú lateral
2. Crea una nueva query
3. Copia y ejecuta el SQL del archivo `prisma/migrations/enable_realtime.sql`

**Nota importante:**

- Si obtienes el error `"relation Order is already member of publication supabase_realtime"`,
  significa que **Realtime ya está configurado correctamente**. ✅
- No necesitas hacer nada más, solo verificar que funciona.

**Opción B: Verificar estado actual**

Ejecuta el script de verificación:

```sql
-- Verificar que Order está en la publicación
SELECT
    tablename,
    pubname,
    '✅ Realtime habilitado' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename = 'Order';
```

Si ves un resultado, Realtime ya está habilitado.

### 3. Verificar Permisos

Asegúrate de que los roles tienen permisos para leer la tabla:

```sql
-- Verificar permisos (ya deberían estar configurados)
GRANT SELECT ON TABLE "Order" TO anon;
GRANT SELECT ON TABLE "Order" TO authenticated;
```

### 4. Verificar Row Level Security (RLS)

Las políticas de RLS seguirán aplicándose. Los usuarios solo recibirán actualizaciones de pedidos que tienen permiso para ver:

- **Restaurantes**: Solo ven pedidos de su restaurante
- **Estudiantes**: Solo ven sus propios pedidos
- **Superadmin**: Ve todos los pedidos

## ✅ Verificación

Para verificar que Realtime está funcionando:

1. Abre el panel de administración de pedidos (`/admin/orders`)
2. En otra ventana o dispositivo, crea un nuevo pedido
3. El pedido debería aparecer automáticamente en el panel sin necesidad de refrescar

## 🔍 Troubleshooting

### Realtime no funciona

1. **Verifica que la tabla está en la publicación:**

   ```sql
   SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
   ```

   Deberías ver `Order` en la lista.

2. **Verifica permisos:**

   ```sql
   SELECT grantee, privilege_type
   FROM information_schema.role_table_grants
   WHERE table_name = 'Order';
   ```

3. **Revisa la consola del navegador:**
   - Abre DevTools (F12)
   - Ve a la pestaña "Console"
   - Busca mensajes de error relacionados con Supabase

4. **Verifica la conexión:**
   - Asegúrate de que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` están correctamente configurados en `.env`

### Error: "Publication does not exist"

Ejecuta primero:

```sql
CREATE PUBLICATION supabase_realtime;
```

Luego agrega la tabla:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE "Order";
```

## 📝 Notas Importantes

- **RLS se mantiene activo**: Los usuarios solo reciben actualizaciones de datos que tienen permiso para ver
- **Performance**: Realtime usa WebSockets, asegúrate de que tu hosting soporte conexiones persistentes
- **Límites**: El plan gratuito de Supabase tiene límites en conexiones concurrentes de Realtime

## 🚀 Siguiente Paso

Una vez configurado Realtime, los pedidos se actualizarán automáticamente en:

- Panel de administración de restaurantes (`/admin/orders`)
- Página de pedidos de estudiantes (si implementas `useRealtimeOrderStatus`)
