# Guía de Despliegue - UPIC

## 📋 Pre-requisitos

### Servicios Externos

1. **Supabase** (Base de datos y Auth)
   - Crear proyecto en https://supabase.com
   - Obtener URL y keys (anon + service role)
   - Crear tablas con Prisma migrations

2. **Wompi** (Pagos)
   - Crear cuenta en https://wompi.co
   - Obtener keys de sandbox/producción
   - Configurar webhook URL

3. **Resend** (Emails - opcional)
   - Crear cuenta en https://resend.com
   - Obtener API key

4. **Vercel** (Hosting)
   - Cuenta en https://vercel.com

## 🚀 Despliegue en Vercel

### 1. Preparación

```bash
# Asegúrate de tener el proyecto en un repositorio Git
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Configurar Proyecto en Vercel

1. Ir a https://vercel.com/new
2. Importar tu repositorio
3. Configurar variables de entorno:

```env
# App
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NODE_ENV=production

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Wompi
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_prod_xxx
WOMPI_PRIVATE_KEY=prv_prod_xxx
WOMPI_WEBHOOK_SECRET=xxx
WOMPI_API_URL=https://production.wompi.co/v1

# Notifications (opcional)
RESEND_API_KEY=re_xxx
WHATSAPP_META_TOKEN=xxx
WHATSAPP_PHONE_NUMBER_ID=xxx

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx

# Commission
DEFAULT_COMMISSION_RATE=0.04
COMMISSION_BASE_MODE=subtotal_plus_tax
```

### 3. Build Settings

Vercel detectará automáticamente Next.js, pero asegúrate:

- **Framework**: Next.js
- **Build Command**: `pnpm build`
- **Output Directory**: `.next`
- **Install Command**: `pnpm install`

### 4. Deploy

```bash
# Deploy desde CLI (opcional)
npm i -g vercel
vercel login
vercel --prod
```

## 🗄️ Base de Datos

### Configurar Supabase

1. **Crear proyecto** en Supabase
2. **Obtener credenciales**:
   - URL: `https://xxx.supabase.co`
   - Anon key (público)
   - Service role key (servidor)

3. **Configurar DATABASE_URL**:
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

4. **Ejecutar migraciones**:
```bash
# Localmente
export DATABASE_URL="postgresql://..."
pnpm db:push

# O desde Supabase SQL Editor
# Copiar el schema de prisma/schema.prisma
```

5. **Poblar datos iniciales**:
```bash
pnpm db:seed
```

### Row Level Security (RLS)

Crear políticas en Supabase:

```sql
-- Ejemplo: Estudiantes solo ven sus pedidos
CREATE POLICY "Students see own orders"
ON "Order"
FOR SELECT
USING (auth.uid() = "studentId");

-- Restaurantes ven solo sus pedidos
CREATE POLICY "Restaurant admins see restaurant orders"
ON "Order"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "User"
    WHERE "User".id = auth.uid()
    AND "User"."restaurantId" = "Order"."restaurantId"
  )
);
```

## 🔒 Seguridad

### 1. Variables de Entorno

- ✅ NUNCA commitear `.env` al repo
- ✅ Usar Vercel Environment Variables
- ✅ Separar variables de producción/desarrollo

### 2. Webhooks

- ✅ Validar firma en `/api/payments/webhook`
- ✅ Usar HTTPS en producción
- ✅ Configurar IP whitelist si es posible

### 3. Rate Limiting

Agregar middleware para rate limiting:

```typescript
// src/middleware.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});
```

## 📊 Monitoreo

### Sentry

1. Crear proyecto en https://sentry.io
2. Obtener DSN
3. Configurar en `.env`

### Logs

- Vercel provee logs automáticos
- Usar Pino para logs estructurados
- Considerar Axiom o Logtail para logs avanzados

## 🔄 CI/CD

GitHub Actions ya está configurado en `.github/workflows/ci.yml`

Flujo automático:
1. Push a `main` → CI ejecuta lint, type-check, build
2. Si pasa → Vercel auto-deploya
3. Si falla → notificación en GitHub

## 🌐 Dominio Personalizado

1. En Vercel → Settings → Domains
2. Agregar dominio (ej: `upic.app`)
3. Configurar DNS:
   - Tipo: CNAME
   - Nombre: @
   - Valor: cname.vercel-dns.com

4. Actualizar `NEXT_PUBLIC_APP_URL` en variables de entorno

## 📱 PWA

El manifest ya está configurado en `public/manifest.json`

**Post-deploy**:
1. Generar iconos (192x192 y 512x512)
2. Reemplazar `public/icon-192.png` y `public/icon-512.png`
3. Verificar PWA en Chrome DevTools → Application

## 🔔 Notificaciones

### Email (Resend)

1. Verificar dominio en Resend
2. Configurar DNS records (SPF, DKIM)
3. Actualizar `from` en `src/lib/notifications/email.ts`

### WhatsApp (Meta Cloud API)

1. Crear app en https://developers.facebook.com
2. Configurar WhatsApp Business
3. Obtener token y phone number ID

## 🧪 Testing en Producción

### Modo Sandbox

Usar keys de Wompi sandbox para testing:
- `pub_test_...`
- `prv_test_...`

### Smoke Tests

Después del deploy:
1. ✅ Cargar home page
2. ✅ Ver lista de restaurantes
3. ✅ Crear orden (sandbox)
4. ✅ Simular pago
5. ✅ Verificar webhook

## 📈 Escalabilidad

### Database

- Supabase escala automáticamente
- Para > 1M registros: índices optimizados
- Considerar read replicas

### Next.js

- Vercel escala automáticamente
- ISR para páginas estáticas
- Edge Functions para APIs críticas

### Cacheo

```typescript
// Ejemplo: cachear menú por 5 min
export const revalidate = 300;
```

## 🆘 Troubleshooting

### Build falla

```bash
# Limpiar y rebuildar
rm -rf .next node_modules
pnpm install
pnpm build
```

### Prisma errors

```bash
# Regenerar cliente
pnpm db:generate
```

### Webhook no funciona

1. Verificar WOMPI_WEBHOOK_SECRET
2. Logs en Vercel → Functions
3. Testear firma manualmente

## 📞 Soporte

- Vercel: https://vercel.com/support
- Supabase: https://supabase.com/support
- Wompi: soporte@wompi.co

---

**¡Listo para producción! 🚀**

