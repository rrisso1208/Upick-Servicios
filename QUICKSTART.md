# 🚀 Upick - Guía de Inicio Rápido

## ⚡ Inicio en 5 minutos

### 1. Clonar e Instalar

```bash
cd upic
pnpm install
```

### 2. Configurar Variables de Entorno

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales mínimas:

```env
# Database (usar Supabase o local PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/upic"

# Supabase (crear cuenta gratis en supabase.com)
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-anon-key"
SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Wompi (sandbox - usar keys de prueba)
NEXT_PUBLIC_WOMPI_PUBLIC_KEY="pub_test_xxx"
WOMPI_PRIVATE_KEY="prv_test_xxx"
WOMPI_WEBHOOK_SECRET="test-secret"
WOMPI_API_URL="https://sandbox.wompi.co/v1"
```

### 3. Configurar Base de Datos

```bash
# Generar cliente Prisma
pnpm db:generate

# Crear tablas en la base de datos
pnpm db:push

# Poblar con datos de prueba (1 universidad, 3 restaurantes, usuarios)
pnpm db:seed
```

### 4. Ejecutar Servidor de Desarrollo

```bash
pnpm dev
```

Visita: **http://localhost:3000**

## 🎯 Usuarios de Prueba

Después de ejecutar `pnpm db:seed`, tendrás estos usuarios:

| Rol | Email | Descripción |
|-----|-------|-------------|
| **Superadmin** | `superadmin@upic.app` | Acceso completo a la plataforma |
| **Admin Restaurante** | `admin@cafeteria-central.com` | Admin de "Cafetería Central" |
| **Estudiante** | `estudiante@unal.edu.co` | Usuario estudiante de prueba |

## 🧪 Probar el Flujo Completo

### 1. Ver Restaurantes

```
http://localhost:3000/universidad-nacional
```

Verás 3 restaurantes de prueba:
- Cafetería Central
- Burger Campus
- Salud Verde

### 2. Explorar Menú

Click en cualquier restaurante para ver productos y opciones.

### 3. Crear Pedido (Simulado)

Como las APIs requieren autenticación, puedes:

**Opción A: Usar Postman/Thunder Client**

```bash
POST http://localhost:3000/api/orders
Content-Type: application/json

{
  "universityId": "...",
  "restaurantId": "...",
  "items": [
    {
      "productId": "...",
      "quantity": 2,
      "options": []
    }
  ]
}
```

**Opción B: Implementar Auth UI**

El proyecto está listo para integrar Supabase Auth. Solo falta crear:
- `/src/app/auth/login/page.tsx`
- `/src/app/auth/callback/page.tsx`

### 4. Ver Panel Admin

```
http://localhost:3000/admin/orders
http://localhost:3000/admin/metrics
```

### 5. Ver Panel Superadmin

```
http://localhost:3000/superadmin/dashboard
```

## 📂 Estructura Clave

```
upic/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Home (lista universidades)
│   │   ├── [universitySlug]/
│   │   │   └── page.tsx                # Lista restaurantes
│   │   ├── admin/                      # Panel restaurante
│   │   └── superadmin/                 # Panel UPIC
│   ├── lib/
│   │   ├── commission.ts               # ⭐ Lógica de comisiones
│   │   ├── slots.ts                    # ⭐ Sistema anti-filas
│   │   └── payments/wompi.ts           # ⭐ Integración pagos
│   └── components/
│       └── ui/
│           ├── SlotPicker.tsx          # Selector de franjas
│           ├── OrderReceipt.tsx        # Comprobante con QR
│           └── OrderCard.tsx           # Card de pedido
├── prisma/
│   └── schema.prisma                   # ⭐ Modelos de DB
└── scripts/
    └── seed.ts                         # Datos de prueba
```

## 🔑 Endpoints API Clave

### Públicos (Estudiantes)

- `GET /api/campus/:universitySlug/restaurants` - Lista restaurantes
- `GET /api/restaurants/:slug/menu` - Menú del restaurante
- `GET /api/restaurants/:id/slots` - Franjas disponibles
- `POST /api/orders` - Crear pedido
- `POST /api/orders/:id/reserve-slot` - Reservar franja
- `POST /api/payments/session` - Iniciar pago
- `GET /api/orders/:id` - Ver pedido

### Webhooks

- `POST /api/payments/webhook` - Callback de Wompi

### Admin Restaurante

- `GET /api/admin/orders` - Lista pedidos
- `POST /api/admin/orders/:id/status` - Cambiar estado

## 🧪 Testing

```bash
# Tests unitarios
pnpm test

# Linting
pnpm lint

# Type checking
pnpm type-check

# Build (verificar que compila)
pnpm build
```

## 🐳 Docker (Opcional)

```bash
# Build
docker build -t upic .

# Run
docker run -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e NEXT_PUBLIC_SUPABASE_URL="..." \
  upic
```

## 📊 Ver Base de Datos

```bash
# Abrir Prisma Studio (GUI para la DB)
pnpm db:studio
```

Visita: http://localhost:5555

## 🔧 Comandos Útiles

```bash
# Desarrollo
pnpm dev                # Servidor desarrollo
pnpm build              # Build producción
pnpm start              # Servidor producción

# Database
pnpm db:generate        # Generar cliente Prisma
pnpm db:push            # Sync schema con DB
pnpm db:migrate         # Crear migración
pnpm db:seed            # Poblar datos
pnpm db:studio          # GUI de base de datos

# Calidad
pnpm lint               # Linter
pnpm lint:fix           # Fix automático
pnpm type-check         # TypeScript check
pnpm format             # Prettier
pnpm test               # Tests
```

## 🚨 Troubleshooting

### Error: "Prisma Client not generated"

```bash
pnpm db:generate
```

### Error: Database connection

Verifica que PostgreSQL esté corriendo:

```bash
# Si usas Supabase, verifica la URL en .env
# Si usas PostgreSQL local:
psql -U postgres -c "CREATE DATABASE upic;"
```

### Error: Port 3000 already in use

```bash
# Cambiar puerto
PORT=3001 pnpm dev
```

### Error de tipos TypeScript

```bash
# Limpiar y reinstalar
rm -rf node_modules .next
pnpm install
pnpm db:generate
```

## 📚 Próximos Pasos

1. **Implementar Auth UI**: Crear páginas de login/signup con Supabase
2. **Checkout completo**: Página de checkout con SlotPicker y pago
3. **Real-time**: Integrar Supabase Realtime para estado de pedidos
4. **Notificaciones**: Configurar Resend para emails
5. **Tests E2E**: Playwright tests para flujo completo
6. **Deploy**: Subir a Vercel (ver DEPLOYMENT.md)

## 💡 Recursos

- **Documentación completa**: Ver `README.md`
- **Guía de deploy**: Ver `DEPLOYMENT.md`
- **Prisma Docs**: https://www.prisma.io/docs
- **Next.js 15**: https://nextjs.org/docs
- **Supabase**: https://supabase.com/docs
- **Wompi API**: https://docs.wompi.co

## 🤝 Soporte

¿Necesitas ayuda?

- Revisa la documentación en `/README.md`
- Verifica logs en la consola
- Usa Prisma Studio para inspeccionar la DB
- Revisa los ejemplos en `/tests`

---

**¡Feliz desarrollo! 🎉**

Ahora tienes una base sólida para construir el sistema completo de UPIC.

