# 🔐 Guía de Implementación de Seguridad

Esta guía documenta las mejoras de seguridad implementadas en Upick y cómo usarlas.

## 📋 Mejoras Implementadas

### 1. ✅ Rate Limiting Mejorado

**Ubicación:** `src/lib/rate-limit.ts`

**Límites configurados según recomendaciones:**
- **Crear pedidos**: 10/min por IP
- **Login/Signup**: 5/min por IP
- **API calls autenticadas**: 100/min por usuario
- **API calls no autenticadas**: 60/min por IP
- **Export**: 5/5min por IP
- **Webhooks**: 1000/min (validación por firma)

**Uso en endpoints:**

```typescript
import { rateLimiters } from '../../../lib/rate-limit';
import { applySecurity, getUserIdFromRequest } from '../../../lib/api-security';

export async function POST(req: NextRequest) {
  // Aplicar seguridad con rate limiting específico
  const securityResponse = await applySecurity(req, {
    rateLimiter: rateLimiters.orderCreation, // 10/min
    requireCSRF: true,
    getUserId: getUserIdFromRequest, // Para usuarios autenticados
  });

  if (securityResponse) {
    return securityResponse; // Retorna error 429 si excede límite
  }

  // Tu lógica aquí...
}
```

**Rate limiters disponibles:**
- `rateLimiters.orderCreation` - 10/min (para crear pedidos)
- `rateLimiters.auth` - 5/min (para login/signup)
- `rateLimiters.authenticated` - 100/min usuarios, 60/min IPs
- `rateLimiters.strict` - 10/min (operaciones sensibles)
- `rateLimiters.export` - 5/5min (exportaciones)

---

### 2. ✅ CSRF Protection

**Ubicación:** `src/lib/csrf.ts`

**Cómo funciona:**
1. El servidor genera un token CSRF y lo almacena en una cookie httpOnly
2. El cliente obtiene el token desde `/api/csrf-token`
3. El cliente envía el token en el header `X-CSRF-Token` en todas las mutaciones
4. El servidor valida que el token del header coincida con el de la cookie

**Uso en el servidor:**

```typescript
import { applySecurity } from '../../../lib/api-security';

export async function POST(req: NextRequest) {
  // CSRF se valida automáticamente con applySecurity
  const securityResponse = await applySecurity(req, {
    requireCSRF: true, // Por defecto es true
  });

  if (securityResponse) {
    return securityResponse; // Retorna error 403 si CSRF inválido
  }

  // Tu lógica aquí...
}
```

**Uso en el cliente (React):**

```typescript
import { useCSRFToken } from '../../../hooks/useCSRFToken';

function MyComponent() {
  const csrfToken = useCSRFToken();

  async function handleSubmit() {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken || '', // Incluir token CSRF
      },
      body: JSON.stringify(data),
    });
  }
}
```

**O usando el helper:**

```typescript
import { getCSRFTokenForRequest } from '../../../hooks/useCSRFToken';

async function makeRequest() {
  const csrfToken = await getCSRFTokenForRequest();
  
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken || '',
    },
    body: JSON.stringify(data),
  });
}
```

**Endpoints que requieren CSRF:**
- Todos los POST, PATCH, PUT, DELETE
- GET, HEAD, OPTIONS no requieren CSRF (son seguros)

---

### 3. ✅ Input Sanitization Mejorado

**Ubicación:** `src/lib/input-sanitization.ts`

**Funciones nuevas:**

#### `sanitizeTextContent()`
Sanitiza contenido de texto removiendo HTML y escapando caracteres peligrosos.

```typescript
import { sanitizeTextContent } from '../../../lib/input-sanitization';

const safeText = sanitizeTextContent(userInput, {
  allowNewlines: true,
  maxLength: 2000,
});
```

#### `sanitizeReviewComment()`
Específico para comentarios de reseñas.

```typescript
import { sanitizeReviewComment } from '../../../lib/input-sanitization';

const safeComment = sanitizeReviewComment(userComment);
// Permite newlines, máximo 2000 caracteres
```

#### `sanitizeOrderNotes()`
Específico para notas de pedidos.

```typescript
import { sanitizeOrderNotes } from '../../../lib/input-sanitization';

const safeNotes = sanitizeOrderNotes(orderNotes);
// Permite newlines, máximo 500 caracteres
```

#### `sanitizeImageUrl()`
Valida que URLs de imágenes sean de dominios confiables.

```typescript
import { sanitizeImageUrl } from '../../../lib/input-sanitization';

const safeUrl = sanitizeImageUrl(imageUrl, [
  'supabase.co',
  'storage.googleapis.com',
]);
// Solo permite URLs de dominios especificados
```

#### `sanitizePhoneNumber()`
Valida y formatea números de teléfono.

```typescript
import { sanitizePhoneNumber } from '../../../lib/input-sanitization';

const safePhone = sanitizePhoneNumber(userPhone);
// Retorna null si es inválido, o el número limpio
```

**Uso en endpoints:**

```typescript
import {
  sanitizeString,
  sanitizeEmail,
  sanitizeReviewComment,
  sanitizeImageUrl,
} from '../../../lib/input-sanitization';

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Sanitizar todos los inputs
  const safeData = {
    email: sanitizeEmail(body.email),
    name: sanitizeString(body.name),
    comment: sanitizeReviewComment(body.comment),
    imageUrl: sanitizeImageUrl(body.imageUrl),
  };

  // Validar que los campos requeridos no estén vacíos
  if (!safeData.email) {
    return NextResponse.json(
      { error: 'Email inválido' },
      { status: 400 }
    );
  }

  // Usar safeData en tu lógica...
}
```

---

### 4. ✅ Headers de Seguridad

**Ubicación:** `next.config.js`

**Headers implementados:**

1. **X-Content-Type-Options: nosniff**
   - Previene MIME type sniffing

2. **X-Frame-Options: DENY**
   - Previene clickjacking

3. **X-XSS-Protection: 1; mode=block**
   - Protección XSS del navegador

4. **Strict-Transport-Security**
   - Fuerza HTTPS

5. **Content-Security-Policy**
   - Controla qué recursos puede cargar la página
   - Permite Supabase, Wompi, y fuentes confiables

6. **Referrer-Policy**
   - Controla qué información de referrer se envía

7. **Permissions-Policy**
   - Deshabilita características no necesarias (cámara, micrófono, etc.)

**Configuración automática:**
Los headers se aplican automáticamente a todas las rutas. No se requiere código adicional.

---

## 🚀 Migración de Endpoints Existentes

### Paso 1: Actualizar Rate Limiting

**Antes:**
```typescript
const rateLimitResult = rateLimiters.standard(req);
if (!rateLimitResult.success) {
  return NextResponse.json({ error: '...' }, { status: 429 });
}
```

**Después:**
```typescript
import { applySecurity, getUserIdFromRequest } from '../../../lib/api-security';

const securityResponse = await applySecurity(req, {
  rateLimiter: rateLimiters.orderCreation, // O el apropiado
  requireCSRF: true,
  getUserId: getUserIdFromRequest,
});

if (securityResponse) {
  return securityResponse;
}
```

### Paso 2: Agregar Sanitización

**Antes:**
```typescript
const { comment } = await req.json();
// Usar comment directamente
```

**Después:**
```typescript
import { sanitizeReviewComment } from '../../../lib/input-sanitization';

const { comment } = await req.json();
const safeComment = sanitizeReviewComment(comment);

if (!safeComment) {
  return NextResponse.json(
    { error: 'Comentario inválido' },
    { status: 400 }
  );
}
```

### Paso 3: Actualizar Cliente para CSRF

**Antes:**
```typescript
fetch('/api/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
```

**Después:**
```typescript
import { useCSRFToken } from '../../../hooks/useCSRFToken';

function Component() {
  const csrfToken = useCSRFToken();

  fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken || '',
    },
    body: JSON.stringify(data),
  });
}
```

---

## 📝 Checklist de Implementación

Para cada endpoint que modifica datos (POST, PATCH, PUT, DELETE):

- [ ] Usar `applySecurity()` con rate limiter apropiado
- [ ] Habilitar CSRF protection (`requireCSRF: true`)
- [ ] Sanitizar todos los inputs del usuario
- [ ] Validar que los datos sanitizados no estén vacíos
- [ ] Actualizar cliente para enviar token CSRF

Para endpoints de lectura (GET):

- [ ] Usar `applySecurity()` con rate limiter apropiado
- [ ] CSRF no es necesario (se omite automáticamente)
- [ ] Sanitizar parámetros de query/URL

---

## 🧪 Testing

### Probar Rate Limiting

```bash
# Hacer 11 requests rápidas (límite es 10/min)
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/orders \
    -H "Content-Type: application/json" \
    -d '{"test": "data"}'
done

# El último debería retornar 429
```

### Probar CSRF

```bash
# Request sin token CSRF (debería fallar)
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Debería retornar 403
```

### Probar Sanitización

```typescript
// Input con HTML malicioso
const maliciousInput = '<script>alert("XSS")</script>Hola';

// Después de sanitizar
const safe = sanitizeTextContent(maliciousInput);
// Resultado: "Hola" (HTML removido y escapado)
```

---

## 🔍 Monitoreo

Los eventos de seguridad se registran automáticamente:

- **Rate limit exceeded**: Se registra con IP y userId
- **CSRF validation failed**: Se registra con IP y path
- **Input sanitization**: Se registra si se detecta contenido peligroso

Revisar logs en:
- Vercel logs (producción)
- Console (desarrollo)
- Sentry (si está configurado)

---

## 📚 Referencias

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [CSRF Protection](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

**Última actualización:** Diciembre 2024

