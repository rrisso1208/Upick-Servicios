/**
 * Restaurant menu page - Fully functional with cart
 *
 * Esta es una PAGE del App Router (Server Component).
 * Su responsabilidad es:
 * - Obtener el restaurante y todo su menú desde la BD
 * - Pasarle esos datos al MenuClient (client component)
 *
 * ❌ Aquí NO hay lógica de carrito
 * ❌ Aquí NO hay estado
 * ✅ Solo fetch + render
 */

import Link from 'next/link'; // Navegación cliente
import { notFound } from 'next/navigation'; // Renderiza automáticamente la página 404
import { Header } from '@/components/layout/Header'; // Header visual
import { prisma } from '@/lib/db'; // Cliente Prisma (BD)
import { MenuClient } from './MenuClient'; // Componente cliente que maneja el carrito

/**
 * Página del menú de un restaurante
 *
 * URL típica:
 * /[universitySlug]/[restaurantSlug]
 */
export default async function RestaurantMenuPage({
                                                   params,
                                                 }: {
  // Next.js App Router entrega params como Promise
  params: Promise<{ universitySlug: string; restaurantSlug: string }>;
}) {
  try {
    // Extraemos los slugs desde la URL
    const { universitySlug, restaurantSlug } = await params;

    /**
     * Consulta principal:
     * Buscamos el restaurante por slug
     * y solo si está activo
     */
    const restaurant = await prisma.restaurant.findUnique({
      where: {
        slug: restaurantSlug,
        isActive: true,
      },

      /**
       * select define EXACTAMENTE qué campos se traen
       * (esto mejora rendimiento y evita sobre-fetching)
       */
      select: {
        // --------------------
        // Datos básicos
        // --------------------
        id: true,
        name: true,
        slug: true,
        type: true,
        location: true,
        description: true,

        // --------------------
        // Imagen del restaurante
        // --------------------
        imageUrl: true,
        imagePosition: true,
        imageScale: true,

        // --------------------
        // Estado del restaurante
        // --------------------
        isOverloaded: true,      // Si está saturado
        overloadUntil: true,     // Hasta cuándo está bloqueado

        // --------------------
        // Reviews
        // --------------------
        averageRating: true,
        reviewCount: true,

        // --------------------
        // Relación con el lugar (universidad / sede)
        // --------------------
        place: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },

        // --------------------
        // Categorías del menú
        // --------------------
        categories: {
          where: {
            isActive: true, // Solo categorías activas
          },
          orderBy: {
            sort: 'asc', // Orden definido por el admin
          },
          select: {
            id: true,
            name: true,
            description: true,

            // Horarios de venta por categoría
            saleHoursStart: true,
            saleHoursEnd: true,
            sort: true,

            // --------------------
            // Productos de la categoría
            // --------------------
            products: {
              where: {
                isActive: true, // Solo productos activos
              },
              orderBy: {
                sort: 'asc',
              },
              include: {
                // --------------------
                // Grupos de opciones (ej: salsas, tamaños)
                // --------------------
                optionGroups: {
                  orderBy: {
                    sort: 'asc',
                  },
                  include: {
                    options: {
                      where: {
                        isActive: true,
                      },
                      orderBy: {
                        sort: 'asc',
                      },
                    },
                  },
                },

                // --------------------
                // Badges del producto (ej: vegano, picante)
                // --------------------
                badges: {
                  include: {
                    badge: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    /**
     * Si no se encuentra el restaurante:
     * → Next.js renderiza automáticamente la página 404
     */
    if (!restaurant) {
      notFound();
    }

    /**
     * Render principal:
     * - Header con botón de volver
     * - MenuClient recibe TODOS los datos
     */
    return (
      <>
        <Header title={restaurant.name} showBack />
        <MenuClient restaurant={restaurant} />
      </>
    );
  } catch (error: any) {
    /**
     * Manejo de errores del servidor
     * (visible en logs de Vercel)
     */
    const errorDetails = {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      name: error?.name,
    };

    console.error('Error loading restaurant page:', error);
    console.error('Error details:', JSON.stringify(errorDetails, null, 2));

    /**
     * En lugar de crashear la app,
     * mostramos una página de error amigable
     */
    return (
      <>
        <Header title="Error" showBack />
        <main className="container-modern min-h-screen py-12">
          <div className="text-center">
            <h1 className="mb-4 text-2xl font-bold text-gray-900">
              Error al cargar el restaurante
            </h1>
            <p className="mb-6 text-gray-600">
              Ocurrió un error al intentar cargar el menú. Por favor intenta de
              nuevo.
            </p>

            {/* Error técnico visible (útil en producción) */}
            {error?.message && (
              <div className="mb-4 rounded-lg bg-red-50 p-4 text-left text-sm text-red-800">
                <strong>Error:</strong> {error.message}

                {error?.code && (
                  <>
                    <br />
                    <strong>Código:</strong> {error.code}
                  </>
                )}

                {error?.meta?.column && (
                  <>
                    <br />
                    <strong>Columna faltante:</strong> {error.meta.column}
                    <br />
                    <span className="text-xs">
                      Ejecuta el script MIGRATION-TABLAS-FALTANTES.sql en
                      Supabase
                    </span>
                  </>
                )}
              </div>
            )}

            <Link href="/" className="btn-primary">
              Volver al inicio
            </Link>
          </div>
        </main>
      </>
    );
  }
}
