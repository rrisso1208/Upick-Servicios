# 🔑 Cómo Obtener Credenciales de Supabase

## 📍 PASO 1: IR AL DASHBOARD

```
https://supabase.com/dashboard
```

## 📍 PASO 2: SELECCIONAR TU PROYECTO

Click en tu proyecto (el que creaste para Upick)

## 📍 PASO 3: OBTENER CREDENCIALES

### **Project URL y Keys:**

1. En el menú lateral izquierdo → **Settings** (⚙️)
2. → **API**

Aquí encontrarás:

**✅ Project URL:**
```
https://tuproyecto.supabase.co
```

**✅ Anon (public) key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
```

**✅ Service role key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
```

---

### **Database URL:**

1. En el menú lateral → **Settings**
2. → **Database**
3. Scroll hasta **Connection string**
4. Selecciona **Session pooler**
5. Copia la URL que termina en `:6543`

Se verá así:
```
postgresql://postgres.[ref]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

**⚠️ IMPORTANTE:** Reemplaza `[PASSWORD]` con tu contraseña real de base de datos

---

## 📋 RESUMEN DE LO QUE NECESITAS:

1. ✅ **NEXT_PUBLIC_SUPABASE_URL** → Project URL
2. ✅ **NEXT_PUBLIC_SUPABASE_ANON_KEY** → anon public key
3. ✅ **SUPABASE_SERVICE_ROLE_KEY** → service_role key
4. ✅ **DATABASE_URL** → Connection string (Session pooler, puerto 6543)

---

## 🎯 DESPUÉS DE OBTENERLAS:

Copia el archivo `ENV-PARA-VERCEL.txt` y reemplaza:
- `https://tuproyecto.supabase.co` → Tu Project URL
- `tu-anon-key-aqui` → Tu Anon key
- `tu-service-key-aqui` → Tu Service role key
- La DATABASE_URL completa con tu conexión real


