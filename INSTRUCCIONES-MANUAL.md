# 🚀 Instrucciones Paso a Paso - Iniciar UPIC

## ⚠️ IMPORTANTE: Sigue EXACTAMENTE estos pasos

---

## PASO 1: Abrir terminal en VS Code

1. **Abre VS Code** (si no está abierto)
2. **Abre la carpeta UPIC:**
   - Menú: File → Open Folder
   - Navega a: `C:\Users\ACER\Documents\upic`
   - Click en **"Seleccionar carpeta"**

3. **Abre la terminal integrada:**
   - Presiona: `Ctrl + ñ` (o `Ctrl + '` o `Ctrl + `)
   - O menú: Terminal → New Terminal

---

## PASO 2: Verificar directorio

En la terminal, deberías ver:
```
PS C:\Users\ACER\Documents\upic>
```

Si NO ves `upic` al final, escribe:
```powershell
cd C:\Users\ACER\Documents\upic
```

---

## PASO 3: Iniciar servidor

Escribe EXACTAMENTE esto (copia y pega):
```powershell
pnpm dev
```

Presiona **Enter**

---

## PASO 4: Esperar a que compile

Verás mensajes pasando. Espera hasta ver algo como:

```
▲ Next.js 15.0.2
- Local:        http://localhost:3000
- Network:      ...

○ Compiling / ...
✓ Compiled / in X.Xs
✓ Ready in 5.2s
```

⏱️ **Esto puede tomar 30-60 segundos la primera vez**

---

## PASO 5: Abrir navegador

1. **Abre tu navegador** (Chrome/Edge/Firefox)
2. **Nueva pestaña de incógnito:**
   - Chrome: `Ctrl + Shift + N`
   - Edge: `Ctrl + Shift + P`
3. **Escribe:** `localhost:3000`
4. **Presiona Enter**

---

## ✅ ¿Qué deberías ver?

**Página principal de UPIC:**
- Título: "Bienvenido a UPIC"
- Subtítulo: "Ordena tu comida y evita las filas"
- Una tarjeta: "Universidad Nacional de Colombia"
- "3 restaurantes disponibles"

---

## ❌ Si ves errores:

### **Error en la terminal:**
Si ves algún error al ejecutar `pnpm dev`, **toma captura y muéstramela**

### **Error en el navegador:**
Si ves "ERR_CONNECTION_REFUSED", significa que el servidor no inició.
- Verifica que la terminal diga "Ready"
- Si no dice "Ready", hay un error de compilación

---

## 🆘 PROBLEMAS COMUNES:

### "Cannot find module..."
```powershell
# Reinstalar dependencias
Remove-Item -Recurse -Force node_modules
pnpm install
pnpm dev
```

### "Port 3000 already in use"
```powershell
# Usar otro puerto
$env:PORT = "3001"
pnpm dev
# Luego abre: http://localhost:3001
```

### "Database error"
El servidor iniciará IGUAL, pero algunas funciones no trabajarán.
Verifica tu `.env` si ves errores de database.

---

## 📸 IMPORTANTE:

Si al ejecutar `pnpm dev` ves CUALQUIER error en rojo, **tómale captura** y muéstramela para ayudarte.

---

## ✅ CHECKLIST:

- [ ] Terminal abierta en: `C:\Users\ACER\Documents\upic`
- [ ] Ejecuté: `pnpm dev`
- [ ] Veo mensaje: "✓ Ready"
- [ ] Abrí navegador en: `http://localhost:3000`
- [ ] Veo página de UPIC (no Match Tag)

---

**Sigue estos pasos y dime en qué paso tienes problemas.**


