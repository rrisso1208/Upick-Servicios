/**
 * GET /api/superadmin/centrals - Listar todas las centrales
 * POST /api/superadmin/centrals - Crear central y desplegar restaurantes
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET - Listar todas las centrales
 */
export async function GET(req: NextRequest) {
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

    const centrals = await (prisma as any).central.findMany({
      include: {
        _count: {
          select: {
            restaurants: true,
            masterProducts: true,
            users: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      data: { centrals },
    });
  } catch (error) {
    console.error('Error fetching centrals:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener centrales' },
      { status: 500 }
    );
  }
}

/**
 * POST - Crear central y desplegar restaurantes masivamente
 * 
 * Body:
 * {
 *   name: string,
 *   legalName?: string,
 *   logoUrl?: string,
 *   bannerUrl?: string,
 *   commissionPercentage: number,
 *   freeFeeThreshold: number,
 *   lowOrderFee: number,
 *   hubIds: string[], // IDs de los Places (Hubs) donde crear restaurantes
 *   adminEmails?: string[] // Emails de admins locales (opcional)
 * }
 */
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const {
      name,
      legalName,
      logoUrl,
      bannerUrl,
      commissionPercentage,
      freeFeeThreshold,
      lowOrderFee,
      hubIds,
      adminEmails = [],
      centralAdminEmail,
    } = body;

    // Validaciones
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Falta el campo requerido: name' },
        { status: 400 }
      );
    }

    if (commissionPercentage === undefined || commissionPercentage < 0 || commissionPercentage > 100) {
      return NextResponse.json(
        { success: false, error: 'commissionPercentage debe estar entre 0 y 100' },
        { status: 400 }
      );
    }

    // Convertir valores a centavos si vienen en pesos
    const freeFeeThresholdCents = freeFeeThreshold ? Math.round(parseFloat(String(freeFeeThreshold)) * 100) : 0;
    const lowOrderFeeCents = lowOrderFee ? Math.round(parseFloat(String(lowOrderFee)) * 100) : 0;
    const commissionPercent = parseFloat(String(commissionPercentage));

    // Si no hay hubIds, solo crear la Central sin desplegar restaurantes
    if (!hubIds || !Array.isArray(hubIds) || hubIds.length === 0) {
      const central = await (prisma as any).central.create({
        data: {
          name,
          legalName: legalName || null,
          logoUrl: logoUrl || null,
          bannerUrl: bannerUrl || null,
          commissionPercentage: commissionPercent,
          freeFeeThreshold: freeFeeThresholdCents,
          lowOrderFee: lowOrderFeeCents,
          isActive: true,
        },
      });

      // Asignar administrador central si se proporcionó
      if (centralAdminEmail && centralAdminEmail.trim()) {
        const email = centralAdminEmail.toLowerCase().trim();
        let adminUser = await prisma.user.findUnique({
          where: { email },
        });

        if (!adminUser) {
          // Crear nuevo usuario como central_admin
          adminUser = await prisma.user.create({
            data: {
              email,
              role: 'central_admin',
              centralId: central.id,
              isActive: true,
            },
          });
        } else {
          // Actualizar usuario existente
          adminUser = await prisma.user.update({
            where: { id: adminUser.id },
            data: {
              role: 'central_admin',
              centralId: central.id,
              restaurantId: null, // Remover asignación de restaurante si existía
            },
          });
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          central,
          restaurantsCreated: 0,
          replicatedProducts: 0,
        },
      });
    }

    // Transacción para crear central y restaurantes
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear la Central
      const central = await (tx as any).central.create({
        data: {
          name,
          legalName: legalName || null,
          logoUrl: logoUrl || null,
          bannerUrl: bannerUrl || null,
          commissionPercentage: commissionPercent,
          freeFeeThreshold: freeFeeThresholdCents,
          lowOrderFee: lowOrderFeeCents,
          isActive: true,
        },
      });

      // 2. Verificar que los Hubs existan
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

      // 3. Crear restaurantes en cada Hub
      const restaurants = [];
      for (const hub of hubs) {
        // Generar slug único para el restaurante
        const baseSlug = `${name.toLowerCase().replace(/\s+/g, '-')}-${hub.name.toLowerCase().replace(/\s+/g, '-')}`;
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
            name: `${name} - ${hub.name}`,
            slug,
            imageUrl: logoUrl || null, // Heredar logo de la Central
            bannerUrl: bannerUrl || null, // Heredar banner de la Central
            commissionPercentage: commissionPercent, // Heredado de Central
            freeFeeThreshold: freeFeeThresholdCents, // Heredado de Central
            lowOrderFee: lowOrderFeeCents, // Heredado de Central
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

      // 6. Asignar administrador central si se proporcionó
      if (centralAdminEmail && centralAdminEmail.trim()) {
        const email = centralAdminEmail.toLowerCase().trim();
        let adminUser = await tx.user.findUnique({
          where: { email },
        });

        if (!adminUser) {
          // Crear nuevo usuario como central_admin
          adminUser = await tx.user.create({
            data: {
              email,
              role: 'central_admin',
              centralId: central.id,
              isActive: true,
            },
          });
        } else {
          // Actualizar usuario existente
          adminUser = await tx.user.update({
            where: { id: adminUser.id },
            data: {
              role: 'central_admin',
              centralId: central.id,
              restaurantId: null, // Remover asignación de restaurante si existía
            },
          });
        }
      }

      return {
        central,
        restaurants,
        assignedAdmins,
        replicatedProducts: existingMasterProducts.length,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        central: result.central,
        restaurantsCreated: result.restaurants.length,
        restaurants: result.restaurants,
        assignedAdmins: result.assignedAdmins,
        replicatedProducts: result.replicatedProducts,
      },
    });
  } catch (error: any) {
    console.error('Error creating central and deploying:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear central y desplegar restaurantes',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

