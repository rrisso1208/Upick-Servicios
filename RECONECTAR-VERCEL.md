# 🔗 Reconectar Proyecto con Vercel

## Paso 1: Verificar que estás logueado

```bash
vercel whoami
```

Si no estás logueado:

```bash
vercel login
```

## Paso 2: Eliminar configuración antigua (si es necesario)

Si el proyecto está dando problemas, puedes eliminar la carpeta `.vercel`:

```bash
# En PowerShell
Remove-Item -Recurse -Force .vercel
```

## Paso 3: Reconectar el proyecto

```bash
vercel link
```

Te preguntará:

- **Set up and deploy?** → Presiona `Y`
- **Which scope?** → Selecciona tu cuenta/team
- **Link to existing project?** → Presiona `Y`
- **What's the name of your existing project?** → Escribe `upic`
- **In which directory is your code located?** → Presiona Enter (actual)

## Paso 4: Verificar variables de entorno

Después de reconectar, verifica que las variables de entorno estén configuradas:

```bash
vercel env ls
```

Si faltan variables, agrégalas desde el dashboard de Vercel o con:

```bash
vercel env add DATABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_URL
# etc...
```

## Paso 5: Hacer deploy

```bash
vercel --prod
```

---

## Alternativa: Crear proyecto nuevo

Si el proyecto anterior fue eliminado completamente, puedes crear uno nuevo:

```bash
# Eliminar configuración antigua
Remove-Item -Recurse -Force .vercel

# Crear nuevo proyecto
vercel --prod
```

Te preguntará si quieres crear un nuevo proyecto, presiona `Y`.

---

## Verificar que funciona

Después del deploy, verifica:

1. El proyecto aparece en https://vercel.com/dashboard
2. Las variables de entorno están configuradas
3. El deploy se completa sin errores
