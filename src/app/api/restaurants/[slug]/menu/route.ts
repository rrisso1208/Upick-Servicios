/**
 * GET /api/restaurants/:slug/menu
 * Get restaurant menu with categories and products
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getRestaurantMenu } from '../../../../../lib/central-menu-query';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

/**
 * GET /api/restaurants/[slug]/menu
 * Obtiene el menú del restaurante.
 * Si el restaurante pertenece a una Central, usa la lógica jerárquica (MasterProduct/BranchProduct).
 * Si no, usa el sistema tradicional (Product).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const restaurant = await (prisma as any).restaurant.findUnique({
      where: { slug, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        location: true,
        imageUrl: true,
        description: true,
        openHours: true,
        centralId: true, // Verificar si pertenece a una Central
        categories: {
          where: { isActive: true },
          orderBy: { sort: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            saleHoursStart: true,
            saleHoursEnd: true,
            sort: true,
          },
        },
      },
    }) as any;

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Si el restaurante pertenece a una Central, usar menú jerárquico
    if (restaurant.centralId) {
      try {
        // Obtener productos del menú jerárquico
        const menuProducts = await getRestaurantMenu(restaurant.id);

        // Mapear productos jerárquicos al formato esperado por el frontend
        const mappedProducts = menuProducts.map((mp: any) => {
          // Parse specs if it's a string (PostgreSQL JSON can come as string)
          let parsedSpecs = mp.specs;
          if (typeof mp.specs === 'string') {
            try {
              parsedSpecs = JSON.parse(mp.specs);
            } catch (e) {
              // If parsing fails, keep as string or null
              parsedSpecs = null;
            }
          }
          
          return {
            id: mp.id, // ID del BranchProduct
            masterProductId: mp.masterProductId,
            name: mp.name,
            description: mp.description,
            price: mp.price,
            basePrice: mp.basePrice,
            localPrice: mp.localPrice,
            promotionPrice: mp.promotionPrice,
            imageUrl: mp.imageUrl,
            imagePosition: mp.imagePosition,
            imageScale: mp.imageScale,
            prepMinutes: mp.prepMinutes,
            isFeatured: mp.isFeatured,
            specs: parsedSpecs,
            optionGroups: mp.optionGroups || [], // Opciones maestras sincronizadas
          };
        });

        // Agrupar en categorías según categoryName/categorySort definidos en el MasterProduct
        const categoryMap = new Map<string, {
          id: string;
          name: string;
          description: string | null;
          saleHoursStart: string | null;
          saleHoursEnd: string | null;
          sort: number;
          products: any[];
        }>();

        for (const product of menuProducts) {
          const key = product.categoryName || 'sin-categoria';
          if (!categoryMap.has(key)) {
            categoryMap.set(key, {
              id: key,
              name: product.categoryName || 'Otros',
              description: null,
              saleHoursStart: product.saleHoursStart,
              saleHoursEnd: product.saleHoursEnd,
              sort: product.categorySort ?? 0,
              products: [],
            });
          }
          const category = categoryMap.get(key)!;
          const mapped = mappedProducts.find((p) => p.id === product.id);
          if (mapped) {
            category.products.push(mapped);
          }
        }

        const categoriesWithProducts =
          categoryMap.size > 0
            ? Array.from(categoryMap.values()).sort((a, b) => {
                if (a.sort === b.sort) {
                  return a.name.localeCompare(b.name);
                }
                return a.sort - b.sort;
              })
            : [
                {
                  id: 'all',
                  name: 'Todos los productos',
                  description: null,
                  saleHoursStart: null,
                  saleHoursEnd: null,
                  sort: 0,
                  products: mappedProducts,
                },
              ];

        return NextResponse.json({
          success: true,
          data: {
            restaurant: {
              id: restaurant.id,
              name: restaurant.name,
              slug: restaurant.slug,
              location: restaurant.location,
              imageUrl: restaurant.imageUrl,
              description: restaurant.description,
              openHours: restaurant.openHours,
            },
            categories: categoriesWithProducts,
            isHierarchical: true, // Flag para indicar que es menú jerárquico
          },
        });
      } catch (error) {
        console.error('Error fetching hierarchical menu:', error);
        // Fallback al sistema tradicional si hay error
      }
    }

    // Sistema tradicional: restaurante independiente
    const restaurantWithProducts = await prisma.restaurant.findUnique({
      where: { slug, isActive: true },
      include: {
        categories: {
          where: { isActive: true },
          orderBy: { sort: 'asc' },
          include: {
            products: {
              where: { isActive: true },
              orderBy: { sort: 'asc' },
              include: {
                optionGroups: {
                  orderBy: { sort: 'asc' },
                  include: {
                    options: {
                      where: { isActive: true },
                      orderBy: { sort: 'asc' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!restaurantWithProducts) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        restaurant: {
          id: restaurantWithProducts.id,
          name: restaurantWithProducts.name,
          slug: restaurantWithProducts.slug,
          location: restaurantWithProducts.location,
          imageUrl: restaurantWithProducts.imageUrl,
          description: restaurantWithProducts.description,
          openHours: restaurantWithProducts.openHours,
        },
        categories: restaurantWithProducts.categories,
        isHierarchical: false,
      },
    });
  } catch (error) {
    console.error('Error fetching menu:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

