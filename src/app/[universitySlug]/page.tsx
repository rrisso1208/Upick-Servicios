/**
 * Place page - Restaurant list
 *
 * ✅ Qué hace esta página (Server Component):
 * 1) Lee el slug del lugar desde la URL (params)
 * 2) Busca el Place en la BD (Prisma)
 * 3) Busca los restaurantes activos de ese Place
 * 4) Para cada restaurante, calcula el "nextSlot" (próxima franja disponible)
 * 5) Renderiza:
 *    - Header con botón de volver
 *    - Un hero / título
 *    - <RestaurantsClient /> con toda la data para interacción
 *
 * ⚠️ Importante:
 * - Es async porque consulta DB y slots
 * - No tiene 'use client' => se ejecuta en el servidor
 */

import { notFound } from 'next/navigation'; // para devolver 404 “oficial” en Next
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { prisma } from '@/lib/db'; // Prisma singleton
import { RestaurantsClient } from './RestaurantsClient'; // UI interactiva (cliente)
import { PickuMascot } from '@/components/ui/PickuMascot';
import Link from 'next/link';
import { Prisma } from '@prisma/client';

// Force dynamic rendering to avoid build-time database queries
// ✅ Esto evita que Next intente ejecutar queries en build (SSG).
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Tipo Restaurant:
 * - Esto es TypeScript usando Prisma para inferir el tipo exacto
 *   del objeto que devuelve `prisma.restaurant.findMany({ select: ... })`
 *
 * Beneficio:
 * - Autocompletado
 * - Menos errores por campos que no existen
 * - Si cambias el select, el tipo se ajusta
 */
type Restaurant = Prisma.RestaurantGetPayload<{
  select: {
    id: true;
    name: true;
    slug: true;
    imageUrl: true;
    imagePosition: true;
    imageScale: true;
    description: true;
    location: true;
    pickupSlotMinutes: true;
    capacityPerSlotDefault: true;
    openHours: true;
    deliveryInternalEnabled: true;
    type: true;

    // Relación products (solo id y name)
    products: {
      select: {
        id: true;
        name: true;
      };
    };

    // Relación foodCategories -> foodCategory
    foodCategories: {
      select: {
        foodCategory: {
          select: {
            id: true;
            name: true;
            slug: true;
            icon: true;
            color: true;
          };
        };
      };
    };
  };
}>;

/**
 * Page component
 *
 * params:
 * - en App Router normalmente params es un objeto
 * - aquí lo tiparon como Promise<{ universitySlug: string }>
 *   (es raro, pero funciona si en su setup llega async)
 */
export default async function PlacePage({
                                          params,
                                        }: {
  params: Promise<{ universitySlug: string }>;
}) {
  // Variables que vamos a llenar con Prisma
  let place: { id: string; name: string; category: string | null } | null =
    null;

  let restaurants: Restaurant[] = [];

  try {
    /**
     * 1) Leer slug desde params
     *
     * Ejemplo de URL: /javeriana
     * universitySlug = "javeriana"
     */
    const { universitySlug } = await params;

    /**
     * 2) Buscar el place en la BD
     *
     * - findUnique por slug
     * - además exigen isActive: true
     * - traen solo id, name, category
     */
    try {
      place = await prisma.place.findUnique({
        // ⚠️ Nota: findUnique normalmente acepta campos únicos.
        // slug es unique en el schema, perfecto.
        // isActive no es unique. En Prisma puro esto suele no permitirlo en where,
        // a menos que tengan algún ajuste o TS suelto.
        // (Pero si compila en tu proyecto, está ok.)
        where: { slug: universitySlug, isActive: true },
        select: {
          id: true,
          name: true,
          category: true,
        },
      });
    } catch (error) {
      console.error('Error fetching place:', error);
      throw new Error('Error al cargar el lugar');
    }

    /**
     * 3) Si no existe => 404
     * notFound() hace que Next muestre su página de 404 (o la tuya custom)
     */
    if (!place) {
      notFound();
    }

    /**
     * 4) Buscar restaurantes activos del place
     * - where: placeId + isActive
     * - select: campos necesarios para render + cálculo slots
     * - incluye productos activos (para mostrar preview / búsqueda / etc.)
     * - incluye categorías de comida (tags)
     */
    try {
      restaurants = await prisma.restaurant.findMany({
        where: {
          placeId: place.id,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          imagePosition: true,
          imageScale: true,
          description: true,
          location: true,
          pickupSlotMinutes: true,
          capacityPerSlotDefault: true,
          openHours: true,
          deliveryInternalEnabled: true,
          type: true,

          // Productos activos (solo id y name)
          products: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
            },
          },

          // Categorías de comida (join table -> foodCategory)
          foodCategories: {
            select: {
              foodCategory: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  icon: true,
                  color: true,
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' }, // orden alfabético
      });
    } catch (error) {
      console.error('Error fetching restaurants:', error);

      // ✅ Decisión de UX:
      // en vez de romper toda la página,
      // continúa con lista vacía.
      restaurants = [];
    }



    /**
     * 6) Render normal (caso feliz)
     * - Header con title = nombre del place
     * - showBack para volver
     * - RestaurantsClient recibe data lista (incluye nextSlot)
     */
    return (
      <>
        <Header title={place.name} showBack />

        <main className="container-modern min-h-screen px-3 py-6 sm:px-4 sm:py-8 lg:py-12">
          {/* Header Section (título + mascot) */}
          <div className="mb-6 animate-fade-in-up">
            <div className="flex items-center justify-between gap-4">

              {/* Text Section */}
              <div>
                <h1 className="text-2xl font-black text-gray-900 sm:text-4xl">
                  Hub {place.name}
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Selecciona un Comercio UPick para hacer tu pedido o reserva
                </p>
              </div>

              {/* 💻 DESKTOP */}
              <div className="hidden sm:block relative mt-12">
                <div className="animate-bounce-slow absolute -top-17 left-1/2 z-10 -translate-x-1/2 sm:left-10 sm:top-5 sm:translate-x-0">
                  <div className="relative rounded-xl bg-white px-3 py-2 shadow-lg ring-1 ring-gray-900/5 sm:px-4">
                    <p className="whitespace-nowrap text-xs font-medium text-gray-900 sm:text-sm">
                      ¡Tengo hambre! 😋
                    </p>
                    <div className="absolute -bottom-2 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-gray-200/50 bg-white ring-1 ring-gray-900/5 sm:left-auto sm:right-8 sm:h-4 sm:w-4 sm:translate-x-0"></div>
                  </div>
                </div>

                <PickuMascot
                  variant="chef"
                  size="2xl"
                  className="mix-blend-multiply transition-transform hover:rotate-3 hover:scale-105"
                />
              </div>

              {/* 📱 MOBILE */}
              <div className="sm:hidden relative flex-shrink-0">
                <div className="absolute -top-1 right-5">
                  <div className="rounded-lg bg-white px-2 py-1 shadow-md text-xs font-medium text-gray-800">
                    ¡Tengo hambre! 😋
                  </div>
                </div>

                <PickuMascot
                  variant="chef"
                  size="lg"
                  className="transition-transform hover:rotate-3 hover:scale-105"
                />
              </div>

            </div>
          </div>

          {/* Client Component: aquí vive la interacción (filtros, UI, click, etc.) */}
          <RestaurantsClient
            restaurants={restaurants}
            universitySlug={universitySlug} // lo necesitan para links / rutas
            placeCategory={place.category}   // puede afectar UI o reglas
          />
        </main>

        <Footer />
      </>
    );
  } catch (error) {
    /**
     * 7) Fallback general:
     * Si algo explotó fuerte (por ejemplo error inesperado),
     * muestran una página de error "bonita" en lugar de crashear.
     */
    console.error('Error loading university page:', error);

    return (
      <>
        <Header title="Error" showBack />
        <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
          <div className="py-12 text-center">
            <h1 className="mb-4 text-2xl font-bold text-gray-900">
              Error al cargar la página
            </h1>
            <p className="mb-6 text-gray-600">
              Ocurrió un error al intentar cargar los Comercios UPick. Por favor
              intenta de nuevo.
            </p>

            {/* Link de regreso al home */}
            <Link href="/" className="btn-primary">
              Volver al inicio
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }
}


