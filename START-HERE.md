# 🎯 Upick - EMPIEZA AQUÍ

## ¿Qué es esto?

**Upick** es un sistema completo de pedidos anticipados para restaurantes universitarios. Todo el código está listo, solo necesitas configurarlo.

---

## 📚 Guías Disponibles

### 1. `SETUP-GUIDE.md` ⭐ **EMPIEZA POR AQUÍ**
**Configuración paso a paso** (30-45 minutos)

Cubre:
- ✅ Instalación de dependencias
- ✅ Crear cuenta Supabase (gratis)
- ✅ Crear cuenta Wompi (gratis)
- ✅ Configurar `.env`
- ✅ Crear base de datos
- ✅ Ejecutar la aplicación

**👉 LEE ESTO PRIMERO**

---

### 2. `QUICKSTART.md`
**Guía rápida de uso** (5 minutos)

Cómo usar la app una vez configurada:
- Navegar por restaurantes
- Crear pedidos
- Ver paneles admin
- Probar endpoints API

---

### 3. `README.md`
**Documentación completa** (referencia)

Todo sobre:
- Arquitectura del sistema
- Modelos de base de datos
- Endpoints API
- Flujo de pagos
- Sistema de comisiones

---

### 4. `DEPLOYMENT.md`
**Cómo desplegar a producción** (cuando estés listo)

Paso a paso para:
- Desplegar en Vercel
- Configurar dominio
- Variables de entorno producción
- Monitoreo y logs

---

### 5. `NEXT-FEATURES.md`
**Próximas funcionalidades** (desarrollo futuro)

Ideas para expandir:
- Realtime updates
- Notificaciones push
- Escáner QR
- Reportes avanzados

---

## ⚡ Quick Start (Para Impacientes)

Si ya sabes lo que haces:

```bash
# 1. Instalar
pnpm install

# 2. Configurar .env (ver SETUP-GUIDE.md paso 4)
cp .env.example .env
# Editar .env con tus credenciales

# 3. Base de datos
pnpm db:generate
pnpm db:push
pnpm db:seed

# 4. Ejecutar
pnpm dev

# 5. Abrir
# http://localhost:3000
```

**⚠️ PERO REALMENTE DEBERÍAS LEER `SETUP-GUIDE.md` PRIMERO**

---

## 🎯 Tu Checklist

- [ ] Leer `SETUP-GUIDE.md` completo
- [ ] Crear cuenta Supabase
- [ ] Crear cuenta Wompi (sandbox)
- [ ] Configurar `.env`
- [ ] Ejecutar `pnpm install`
- [ ] Ejecutar `pnpm db:generate`
- [ ] Ejecutar `pnpm db:push`
- [ ] Ejecutar `pnpm db:seed`
- [ ] Ejecutar `pnpm dev`
- [ ] Abrir http://localhost:3000
- [ ] Verificar que todo funciona
- [ ] Leer `NEXT-FEATURES.md` para siguientes pasos

---

## 💡 ¿Qué está incluido?

### Backend ✅
- ✅ 16 modelos de base de datos (Prisma)
- ✅ 15+ endpoints API REST
- ✅ Sistema de autenticación (Supabase)
- ✅ Sistema de comisiones inteligente
- ✅ Motor anti-filas con reservas
- ✅ Integración de pagos (Wompi)
- ✅ Webhooks seguros
- ✅ Validaciones con Zod
- ✅ Logging estructurado

### Frontend ✅
- ✅ Next.js 15 + React 19 + TypeScript
- ✅ Tailwind CSS
- ✅ Páginas responsivas (mobile-first)
- ✅ Componentes reutilizables
- ✅ PWA ready (manifest)
- ✅ Páginas de estudiante
- ✅ Panel admin restaurante
- ✅ Panel superadmin UPIC

### DevOps ✅
- ✅ Docker configurado
- ✅ GitHub Actions (CI/CD)
- ✅ ESLint + Prettier
- ✅ Husky + lint-staged
- ✅ Tests unitarios (Vitest)
- ✅ Tests E2E ready (Playwright)

### Documentación ✅
- ✅ README completo (18k palabras)
- ✅ Guía de setup paso a paso
- ✅ Guía de deployment
- ✅ Guía de desarrollo
- ✅ Ejemplos de código
- ✅ Troubleshooting

---

## 🚀 ¿Cuánto tiempo toma?

| Tarea | Tiempo Estimado |
|-------|----------------|
| Leer SETUP-GUIDE.md | 10 min |
| Crear cuentas (Supabase + Wompi) | 15 min |
| Configurar .env | 5 min |
| Instalar y configurar DB | 5 min |
| Primer `pnpm dev` | 2 min |
| **TOTAL** | **~40 min** |

---

## ❓ ¿Necesitas Ayuda?

### Errores Comunes

**"Prisma Client not generated"**
```bash
pnpm db:generate
```

**"Can't reach database"**
- Verifica `DATABASE_URL` en `.env`
- Verifica contraseña de Supabase

**"Module not found"**
```bash
rm -rf node_modules .next
pnpm install
```

### Recursos

- 📖 Toda la documentación está en `/`
- 🔍 Busca en `README.md` (CTRL+F)
- 🐛 Revisa los logs en la terminal
- 🗄️ Usa Prisma Studio: `pnpm db:studio`

---

## 🎓 Aprendizaje

Este proyecto es perfecto para aprender:
- ✅ Next.js 15 App Router
- ✅ Prisma ORM
- ✅ Supabase
- ✅ TypeScript avanzado
- ✅ Arquitectura multi-tenant
- ✅ Integración de pagos
- ✅ Webhooks
- ✅ PWA

---

## 📞 Contacto

Si te quedas atascado:
1. Lee `SETUP-GUIDE.md` detenidamente
2. Revisa la sección Troubleshooting
3. Verifica tu `.env`
4. Revisa los logs de la terminal
5. Usa Prisma Studio para inspeccionar la DB

---

## 🎉 ¡Listo para Empezar!

**Próximo paso:** Abre `SETUP-GUIDE.md` y sigue las instrucciones.

**¡Éxito con UPIC! 🚀**

