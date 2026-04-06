/**
 * Home page - Campus selection
 *
 * Esta es la página principal (/)
 * Su responsabilidad es:
 * - Consultar los campuses (Places)
 * - Consultar las ciudades
 * - Manejar errores de BD
 * - Pasar los datos a un componente CLIENTE para renderizar
 */

// Header visual (navbar / encabezado)
import { Header } from '@/components/layout/Header';

// Cliente de Prisma (singleton)
// Se usa SOLO en server components / backend
import { prisma } from '@/lib/db';

// Componente CLIENTE que renderiza la UI interactiva
import { PlacesClient } from './PlacesClient';

/**
 * CONFIGURACIÓN DE RENDERIZADO (Next.js App Router)
 */

// Obliga a que esta página sea SIEMPRE dinámica
// ❌ No se renderiza en build time
// ✅ Se ejecuta en cada request
export const dynamic = 'force-dynamic';

// Evita cacheo (ISR / revalidate)
// Cada request consulta datos frescos
export const revalidate = 0;

/**
 * HOME PAGE
 *
 * NOTA CLAVE:
 * - Esta función es async
 * - Es un SERVER COMPONENT (no tiene "use client")
 * - Aquí SÍ se puede acceder a la base de datos
 */
export default async function HomePage() {
  // Arreglos donde guardaremos los resultados
  let places = [];
  let cities = [];

  // Mensaje de error que se pasará al frontend
  let errorMessage: string | null = null;

  try {
    /**
     * Paso 1: Verificar que la BD esté configurada
     * Esto evita que Prisma crashee si no existe DATABASE_URL
     */
    if (!process.env.DATABASE_URL) {
      errorMessage = 'Configuración de base de datos no encontrada';
      console.error('DATABASE_URL is not configured');
    } else {
      /**
       * Paso 2: Consultar BD
       *
       * Se hacen DOS consultas:
       * - Places activos
       * - Cities activas que tengan places activos
       *
       * Se ejecutan EN PARALELO para mayor eficiencia
       * y se les pone un TIMEOUT de 10 segundos
       */

      const [placesData, citiesData] = await Promise.race([
        /**
         * Promise.all:
         * Ejecuta ambas consultas al mismo tiempo
         */
        Promise.all([
          /**
           * CONSULTA 1: Places (campus)
           */
          prisma.place.findMany({
            where: { isActive: true }, // solo places activos
            select: {
              id: true,
              name: true,
              slug: true,
              imageUrl: true,
              imagePosition: true,
              imageScale: true,
              cityId: true,
              latitude: true,
              longitude: true,

              // Trae la ciudad asociada (JOIN)
              city: {
                select: {
                  id: true,
                  name: true,
                },
              },

              // Cuenta cuántos restaurantes activos tiene cada place
              _count: {
                select: {
                  restaurants: {
                    where: { isActive: true },
                  },
                },
              },
            } as any, // ⚠️ hack de typing (lo revisaremos luego)
            orderBy: [
              { featured: 'desc' },
              { displayOrder: 'asc' },
              { name: 'asc' }
            ] as any,
          }) as any,

          /**
           * CONSULTA 2: Cities
           *
           * Solo ciudades activas
           * que tengan al menos un place activo
           */
          (prisma as any).city.findMany({
            where: {
              isActive: true,
              places: {
                some: {
                  isActive: true,
                },
              },
            },
            select: {
              id: true,
              name: true,
              code: true,

              // Cuenta cuántos places activos tiene la ciudad
              _count: {
                select: {
                  places: {
                    where: {
                      isActive: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              name: 'asc',
            },
          }) as any,
        ]),

        /**
         * TIMEOUT DE SEGURIDAD
         *
         * Si la BD tarda más de 10 segundos,
         * se lanza un error manual
         */
        new Promise<any[]>((_, reject) =>
          setTimeout(() => reject(new Error('Database query timeout')), 10000)
        ),
      ]) as [any[], any[]];

      // Si todo salió bien, asignamos resultados
      places = placesData;
      cities = citiesData;
    }
  } catch (error: any) {
    /**
     * MANEJO DE ERRORES
     *
     * Si falla la BD, Prisma, timeout, etc.
     * - Se loggea todo
     * - Se devuelve UI vacía pero estable
     */

    console.error('Error fetching places:', error);

    console.error('Error details:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
      DATABASE_URL: process.env.DATABASE_URL
        ? 'configured'
        : 'NOT CONFIGURED',
      NODE_ENV: process.env.NODE_ENV,
    });

    errorMessage =
      'Error al conectar con la base de datos. Por favor intenta más tarde.';

    // Importante:
    // No se rompe la página, solo se mandan arrays vacíos
    places = [];
    cities = [];
  }

  /**
   * RENDER FINAL
   *
   * NOTA CLAVE:
   * - Este componente NO renderiza la UI pesada
   * - Solo pasa datos a un componente CLIENTE
   */
  return (
    <>
      {/* Header global */}
      <Header />

      {/*
        PlacesClient:
        - Es un CLIENT COMPONENT
        - Maneja interacciones, filtros, clicks
        - Recibe datos ya procesados desde el servidor
      */}
      <PlacesClient
        places={places}
        cities={cities}
        errorMessage={errorMessage}
      />
    </>
  );
}

