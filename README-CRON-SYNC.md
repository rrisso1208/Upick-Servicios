# Sincronización Automática de Menús - Configuración

## 📋 Descripción

El sistema de sincronización automática permite sincronizar los menús de todos los restaurantes con POS habilitado de forma periódica.

## ⚙️ Configuración

### Opción 1: Vercel Cron (Recomendado para Vercel)

El archivo `vercel.json` ya está configurado para ejecutar la sincronización cada 6 horas.

**Configurar Secret Token:**

1. En Vercel Dashboard, ve a Settings > Environment Variables
2. Agrega: `CRON_SECRET` con un valor secreto (ej: `tu-secreto-super-seguro-123`)
3. El endpoint verificará este token antes de ejecutar

**Verificar configuración:**

```bash
# Verificar que el cron está configurado
cat vercel.json
```

### Opción 2: Cron Job Externo

Si no usas Vercel, puedes configurar un cron job en tu servidor:

```bash
# Editar crontab
crontab -e

# Agregar línea para ejecutar cada 6 horas
0 */6 * * * curl -X GET "https://tu-dominio.com/api/cron/sync-menus" -H "Authorization: Bearer ${CRON_SECRET}"
```

### Opción 3: Servicio de Tareas Programadas

Puedes usar servicios como:

- **EasyCron**: https://www.easycron.com
- **Cron-job.org**: https://cron-job.org
- **GitHub Actions**: Para repositorios en GitHub

**Ejemplo con GitHub Actions:**

```yaml
# .github/workflows/sync-menus.yml
name: Sync Menus
on:
  schedule:
    - cron: '0 */6 * * *' # Cada 6 horas
  workflow_dispatch: # Permite ejecución manual

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Sync
        run: |
          curl -X GET "${{ secrets.APP_URL }}/api/cron/sync-menus" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

## 🔒 Seguridad

El endpoint `/api/cron/sync-menus` requiere autenticación mediante token:

```bash
# Ejemplo de llamada
curl -X GET "https://tu-dominio.com/api/cron/sync-menus" \
  -H "Authorization: Bearer tu-cron-secret"
```

**Importante**: Nunca expongas el `CRON_SECRET` en el código o logs.

## 📊 Monitoreo

El endpoint retorna información detallada:

```json
{
  "success": true,
  "message": "Sincronización completada: 5/5 exitosas",
  "data": {
    "total": 5,
    "successful": 5,
    "failed": 0,
    "results": [
      {
        "restaurantId": "...",
        "restaurantName": "Restaurante A",
        "success": true,
        "message": "Menú sincronizado exitosamente"
      }
    ]
  }
}
```

## 🚨 Troubleshooting

### El cron no se ejecuta

1. Verificar que `vercel.json` esté en la raíz del proyecto
2. Verificar que el cron esté desplegado en Vercel
3. Revisar logs en Vercel Dashboard > Functions > Cron Jobs

### Error 401 (No autorizado)

1. Verificar que `CRON_SECRET` esté configurado en variables de entorno
2. Verificar que el token en el header coincida con `CRON_SECRET`

### Sincronizaciones fallan

1. Revisar logs del servidor
2. Verificar credenciales POS de cada restaurante
3. Verificar conectividad con APIs del POS

## 📝 Notas

- La sincronización automática preserva todas las personalizaciones visuales
- Solo actualiza precios, inventario y nombres base desde el POS
- Las notificaciones se crean automáticamente cuando hay cambios
- El historial se guarda en `MenuSyncHistory` para auditoría

---

**Última actualización**: Enero 2024
