# 📖 Guía de Uso - Upick

**Sistema completo de pedidos universitarios**

---

## 🚀 INICIO RÁPIDO

### **Servidor en desarrollo:**
```bash
cd C:\Users\ACER\Documents\upic
pnpm dev
```

**URL:** http://localhost:3002

---

## 👥 USUARIOS DE PRUEBA

Creados automáticamente con `pnpm db:seed`:

| Rol | Email | Contraseña | Acceso |
|-----|-------|------------|--------|
| 👑 **Superadmin** | superadmin@upic.app | Via magic link | `/superadmin/*` |
| 🍽️ **Admin Restaurante** | admin@cafeteria-central.com | Via magic link | `/admin/*` |
| 👨‍🎓 **Estudiante** | estudiante@unal.edu.co | Via magic link | Todo público |

### **Cómo usar:**
1. Ve a: http://localhost:3002/auth/login
2. Ingresa uno de los emails de arriba
3. Click "Enviar enlace mágico"
4. Ve a Supabase → **Authentication** → **Users**
5. Click en el usuario → "Send magic link"
6. Copia el link y ábrelo en tu navegador

---

## 🛒 FLUJO COMPLETO DE PEDIDO

### **Como Estudiante:**

1. **Explorar restaurantes:**
   - Abre: http://localhost:3002
   - Click en "Universidad Nacional de Colombia"
   - Verás 3 restaurantes

2. **Ver menú:**
   - Click en "Cafetería Central" (o cualquier otro)
   - Verás categorías y productos
   - Precios en pesos colombianos

3. **Agregar al carrito:**
   - Click "Agregar" en un producto
   - Si tiene opciones (ej: tamaño), selecciónalas
   - Verás botón flotante ROJO abajo a la derecha

4. **Checkout:**
   - Click en el botón rojo del carrito
   - Verás resumen de tu pedido
   - Selecciona una franja de recogida
   - Selecciona método de pago (PSE o Tarjeta)
   - Click "Pagar"

5. **Ver comprobante:**
   - Después del pago verás tu código de 6 dígitos
   - QR code
   - Hora exacta de recogida

---

## 🍽️ PANEL DE RESTAURANTE

### **Como Admin de Restaurante:**

1. **Login:** http://localhost:3002/auth/login
   - Email: `admin@cafeteria-central.com`

2. **Ver pedidos (KDS):**
   - http://localhost:3002/admin/orders
   - Verás columnas Kanban:
     - Pendientes
     - En preparación
     - Listos
     - Entregados
   - **Actualización en tiempo real** (punto verde parpadeante)

3. **Gestionar menú:**
   - http://localhost:3002/admin/menu
   - **Crear categoría:** Click "Nueva Categoría"
   - **Crear producto:** Click "Nuevo Producto"
   - **Subir imagen:** Click "Subir imagen" en el formulario
   - **Editar:** Click en el ícono ✏️
   - **Desactivar/Activar:** Click en el botón

4. **Ver métricas:**
   - http://localhost:3002/admin/metrics
   - Cambia período: Hoy, Semana, Mes
   - **Exportar CSV:** Click "Exportar CSV"
   - Verás:
     - Ventas totales
     - Comisión Upick
     - Fees de pasarela
     - Ingresos netos
     - Top productos

5. **Validar entregas:**
   - http://localhost:3002/admin/scan
   - Ingresa código de 6 dígitos del estudiante
   - Click "Validar y Entregar"
   - Se marca como entregado automáticamente

---

## 👑 PANEL SUPERADMIN

### **Como Superadmin (Upick):**

1. **Login:** http://localhost:3002/auth/login
   - Email: `superadmin@upic.app`

2. **Dashboard:**
   - http://localhost:3002/superadmin/dashboard
   - Vista general de la plataforma

3. **Gestionar universidades:**
   - http://localhost:3002/superadmin/universities
   - Click "Nueva Universidad"
   - Llena nombre y slug
   - Verás estadísticas por universidad

4. **Gestionar restaurantes:**
   - http://localhost:3002/superadmin/restaurants
   - Click "Nuevo Restaurante"
   - Selecciona universidad
   - Configura horarios y capacidad

5. **Ver métricas globales:**
   - Dashboard muestra métricas consolidadas
   - Comisiones totales de Upick
   - Ranking de restaurantes

---

## 🧪 PROBAR REALTIME

### **Test de actualizaciones en tiempo real:**

1. **Abre 2 ventanas del navegador:**
   - Ventana 1: KDS → http://localhost:3002/admin/orders
   - Ventana 2: Comprobante de un pedido

2. **En ventana 1 (KDS):**
   - Cambia el estado de un pedido
   - Arrastra a "Listos"

3. **En ventana 2 (Comprobante):**
   - Verás que se actualiza AUTOMÁTICAMENTE
   - Sin refrescar la página
   - Aparecerá banner "¡Tu pedido está listo!"

---

## 📸 SUBIR IMÁGENES DE PRODUCTOS

### **Paso a paso:**

1. Ve a: http://localhost:3002/admin/menu
2. Click "Nuevo Producto"
3. Llena formulario
4. Click "Subir imagen"
5. Selecciona una imagen (JPG, PNG, WEBP)
6. Máximo 5MB
7. Verás preview
8. Click "Crear Producto"
9. ✅ Imagen subida a Supabase Storage

---

## 📊 EXPORTAR REPORTES

### **Desde métricas:**

1. http://localhost:3002/admin/metrics
2. Selecciona período (Hoy/Semana/Mes)
3. Click "Exportar CSV"
4. Se descarga archivo con:
   - ID de pedido
   - Cliente
   - Productos
   - Subtotal, IVA, propina
   - Comisión (% y monto)
   - Fees de pasarela
   - Neto para restaurante

---

## 🔧 CONFIGURACIONES OPCIONALES

### **A) Configurar Wompi (Pagos reales):**

**Archivo:** `.env`

Actualiza estas líneas:
```env
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_test_tu_key_aqui
WOMPI_PRIVATE_KEY=prv_test_tu_key_aqui
WOMPI_WEBHOOK_SECRET=tu_secret_aqui
```

**Cómo obtener:**
1. Regístrate en: https://comercios.wompi.co
2. Modo Sandbox (para pruebas)
3. Configuración → Producción y Pruebas
4. Copia las keys de "Pruebas"

---

### **B) Configurar Resend (Emails):**

**Archivo:** `.env`

Descomenta y actualiza:
```env
RESEND_API_KEY=re_tu_key_aqui
```

**Cómo obtener:**
1. Regístrate en: https://resend.com (gratis 3k emails/mes)
2. Crea API key
3. Verifica tu dominio (opcional)

---

### **C) Configurar WhatsApp:**

**Archivo:** `.env`

Descomenta y actualiza:
```env
WHATSAPP_META_TOKEN=tu_token_aqui
WHATSAPP_PHONE_NUMBER_ID=tu_phone_id_aqui
```

---

## 🐛 TROUBLESHOOTING

### **Error: "Cannot connect to database"**
- Verifica `.env` → `DATABASE_URL`
- Verifica que Supabase esté activo

### **Imágenes no se ven:**
- Verifica que el bucket sea público
- Verifica políticas de storage

### **Realtime no funciona:**
- Verifica que habilitaste Replication en tabla `Order`
- Supabase → Database → Publications

### **Error 401 en APIs:**
- Verifica que estés logueado
- Verifica rol del usuario

---

## 📱 PÁGINAS DISPONIBLES

### **Públicas (sin auth):**
- `/` - Home
- `/[universidad]` - Restaurantes
- `/[universidad]/[restaurante]` - Menú
- `/[universidad]/checkout` - Checkout
- `/orders/[id]/receipt` - Comprobante
- `/auth/login` - Login
- `/auth/signup` - Registro

### **Protegidas (requieren auth):**
- `/orders` - Mis pedidos (estudiante)
- `/admin/orders` - KDS (admin)
- `/admin/menu` - Gestión menú (admin)
- `/admin/metrics` - Métricas (admin)
- `/admin/scan` - Validar entregas (admin)
- `/superadmin/*` - Panel global (superadmin)

---

## 🎯 CARACTERÍSTICAS DESTACADAS

### **Sistema Anti-Filas:**
- Franjas de 10 minutos configurables
- Capacidad por franja (25 pedidos default)
- Reserva temporal (8 min) durante pago
- Liberación automática

### **Comisiones Inteligentes:**
- 4% por defecto (configurable)
- Prioridad: Restaurante > Universidad > Global
- Cálculo automático al aprobar pago
- Transparencia total (se guarda tasa aplicada)

### **Realtime:**
- KDS actualizado en vivo
- Estudiantes ven estado en tiempo real
- Notificaciones browser
- Sin polling, sin refresh

---

## 📈 ESCALABILIDAD

**Soporta:**
- ✅ Múltiples universidades
- ✅ Múltiples restaurantes por universidad
- ✅ Miles de productos
- ✅ Miles de pedidos diarios
- ✅ Queries optimizadas con índices
- ✅ Caching con ISR

---

## 🚀 DEPLOY A PRODUCCIÓN

Ver guía completa en: **`DEPLOYMENT.md`**

**Resumen rápido:**
1. Push a GitHub
2. Conectar con Vercel
3. Configurar variables de entorno
4. Deploy automático

---

## 📞 SOPORTE

**Documentos útiles:**
- `README.md` - Documentación técnica
- `DEPLOYMENT.md` - Deploy a producción
- `FINAL-SUMMARY.md` - Resumen completo
- `TROUBLESHOOTING.md` - Solución de problemas

**Comandos útiles:**
```bash
pnpm dev          # Desarrollo
pnpm build        # Build producción
pnpm db:studio    # Ver base de datos
pnpm test         # Tests unitarios
pnpm test:e2e     # Tests E2E
```

---

## ✅ CHECKLIST DE PRODUCCIÓN

Antes de ir a producción:

- [x] Base de datos configurada
- [x] Políticas de seguridad
- [x] Realtime habilitado
- [ ] Wompi configurado (producción)
- [ ] Resend configurado (opcional)
- [ ] WhatsApp configurado (opcional)
- [ ] Deploy a Vercel
- [ ] Dominio personalizado
- [ ] Tests pasando
- [ ] Monitoreo (Sentry opcional)

---

**🎊 ¡Upick está listo para usar y escalar! 🎊**


