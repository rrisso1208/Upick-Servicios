/**
 * POST /api/superadmin/centrals/[id]/deploy
 * Desplegar restaurantes de una Central existente en Hubs seleccionados
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../../lib/auth';
import { syncMasterProductToBranches } from '../../../../../../lib/central-sync';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization');
    let user;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      user = await getAuthUserFromHeader(authHeader);
    }

    if (!user) {
      user = await getAuthUser();
    }

    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id: centralId } = await params;
    const body = await req.json();
    const { hubIds, adminEmails = [] } = body;

    if (!hubIds || !Array.isArray(hubIds) || hubIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Se requiere al menos un Hub' },
        { status: 400 }
      );
    }

    // Verificar que la Central existe
    const central = await (prisma as any).central.findUnique({
      where: { id: centralId },
    });

    if (!central) {
      return NextResponse.json(
        { success: false, error: 'Central no encontrada' },
        { status: 404 }
      );
    }

    // Transacción para crear restaurantes
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verificar que los Hubs existan
      const hubs = await tx.place.findMany({
        where: {
          id: { in: hubIds },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (hubs.length !== hubIds.length) {
        throw new Error('Uno o más Hubs no existen o están inactivos');
      }

      // 2. Verificar que no existan restaurantes de esta Central en estos Hubs
      const existingRestaurants = await tx.restaurant.findMany({
        where: {
          centralId,
          placeId: { in: hubIds },
        },
      });

      if (existingRestaurants.length > 0) {
        const existingHubs = existingRestaurants.map((r) => r.placeId);
        throw new Error(
          `Ya existen restaurantes de esta Central en los siguientes Hubs: ${existingHubs.join(', ')}`
        );
      }

      // 3. Crear restaurantes en cada Hub
      const restaurants = [];
      for (const hub of hubs) {
        // Generar slug único para el restaurante
        const baseSlug = `${central.name.toLowerCase().replace(/\s+/g, '-')}-${hub.name.toLowerCase().replace(/\s+/g, '-')}`;
        let slug = baseSlug;
        let counter = 1;

        // Verificar unicidad del slug
        while (await tx.restaurant.findUnique({ where: { slug } })) {
          slug = `${baseSlug}-${counter}`;
          counter++;
        }

        // Crear restaurante heredando valores financieros e imágenes de la Central
        const restaurant = await tx.restaurant.create({
          data: {
            placeId: hub.id,
            centralId: central.id,
            name: `${central.name} - ${hub.name}`,
            slug,
            imageUrl: central.logoUrl || null, // Heredar logo de la Central
            bannerUrl: central.bannerUrl || null, // Heredar banner de la Central
            commissionPercentage: Number(central.commissionPercentage), // Heredado de Central
            freeFeeThreshold: central.freeFeeThreshold, // Heredado de Central
            lowOrderFee: central.lowOrderFee, // Heredado de Central
            isActive: true,
          } as any,
        });

        restaurants.push(restaurant);
      }

      // 4. Asignar administradores locales si se proporcionaron
      const assignedAdmins = [];
      if (adminEmails && adminEmails.length > 0) {
        for (let i = 0; i < adminEmails.length && i < restaurants.length; i++) {
          const email = adminEmails[i];
          const restaurant = restaurants[i];

          // Buscar usuario existente o crear uno nuevo
          let adminUser = await tx.user.findUnique({
            where: { email: email.toLowerCase().trim() },
          });

          if (!adminUser) {
            // Crear nuevo usuario como restaurant_admin
            adminUser = await tx.user.create({
              data: {
                email: email.toLowerCase().trim(),
                role: 'restaurant_admin',
                restaurantId: restaurant.id,
                isActive: true,
              },
            });
          } else {
            // Actualizar usuario existente
            adminUser = await tx.user.update({
              where: { id: adminUser.id },
              data: {
                restaurantId: restaurant.id,
                role: 'restaurant_admin',
              },
            });
          }

          assignedAdmins.push({
            email: adminUser.email,
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
          });
        }
      }

      // 5. Si ya existen MasterProducts, replicarlos en los nuevos restaurantes
      const existingMasterProducts = await (tx as any).masterProduct.findMany({
        where: {
          centralId: central.id,
        },
      });

      if (existingMasterProducts.length > 0) {
        // Crear BranchProducts para cada MasterProduct en cada restaurante
        const branchProductsData = [];
        for (const masterProduct of existingMasterProducts) {
          for (const restaurant of restaurants) {
            branchProductsData.push({
              restaurantId: restaurant.id,
              masterProductId: masterProduct.id,
              localPrice: null, // Usar precio base del master
              isLocallyActive: true, // Activo por defecto
            });
          }
        }

        // Insertar en lotes para mejor performance
        if (branchProductsData.length > 0) {
          await (tx as any).branchProduct.createMany({
            data: branchProductsData,
            skipDuplicates: true, // Evitar duplicados si ya existen
          });
        }
      }

      return {
        restaurants,
        assignedAdmins,
        replicatedProducts: existingMasterProducts.length,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        restaurantsCreated: result.restaurants.length,
        restaurants: result.restaurants,
        assignedAdmins: result.assignedAdmins,
        replicatedProducts: result.replicatedProducts,
      },
    });
  } catch (error: any) {
    console.error('Error deploying restaurants:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al desplegar restaurantes',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

