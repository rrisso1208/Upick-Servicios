/**
 * GET /api/superadmin/master-products?centralId=xxx - Listar MasterProducts de una Central
 * POST /api/superadmin/master-products - Crear MasterProduct y sincronizar a restaurantes
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getAuthUser } from '../../../../lib/auth';
import { syncMasterProductToBranches } from '../../../../lib/central-sync';

export const dynamic = 'force-dynamic';

/**
 * GET - Listar MasterProducts de una Central
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const centralId = searchParams.get('centralId');

    if (!centralId) {
      return NextResponse.json(
        { success: false, error: 'centralId es requerido' },
        { status: 400 }
      );
    }

    const masterProducts = await (prisma as any).masterProduct.findMany({
      where: {
        centralId,
      },
      include: {
        _count: {
          select: {
            branchProducts: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      data: { masterProducts },
    });
  } catch (error) {
    console.error('Error fetching master products:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener productos maestros' },
      { status: 500 }
    );
  }
}

/**
 * POST - Crear MasterProduct y sincronizar a todos los restaurantes de la Central
 * 
 * Body:
 * {
 *   centralId: string,
 *   name: string,
 *   description?: string,
 *   imageUrl?: string,
 *   imagePosition?: string,
 *   imageScale?: number,
 *   sku?: string,
 *   basePrice: number, // En centavos
 *   isGloballyAvailable?: boolean (default: true)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // La creación de productos maestros solo está permitida desde central-admin
    return NextResponse.json(
      {
        success: false,
        error: 'La creación de productos maestros solo está disponible desde el panel de administración central. Por favor, usa el panel de central-admin para crear productos maestros.',
      },
      { status: 403 }
    );

    const body = await req.json();
    const {
      centralId,
      name,
      description,
      imageUrl,
      imagePosition = 'center',
      imageScale = 1.0,
      sku,
      basePrice,
      isGloballyAvailable = true,
    } = body;

    // Validaciones
    if (!centralId || !name || basePrice === undefined) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos (centralId, name, basePrice)' },
        { status: 400 }
      );
    }

    // Convertir basePrice a centavos si viene en pesos
    const basePriceCents = Math.round(parseFloat(String(basePrice)) * 100);

    if (basePriceCents < 0) {
      return NextResponse.json(
        { success: false, error: 'basePrice debe ser un número positivo' },
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

    // Crear MasterProduct y sincronizar en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear MasterProduct
      const masterProduct = await (tx as any).masterProduct.create({
        data: {
          centralId,
          name,
          description: description || null,
          imageUrl: imageUrl || null,
          imagePosition,
          imageScale,
          sku: sku || null,
          basePrice: basePriceCents,
          isGloballyAvailable,
        },
      });

      // 2. Sincronizar a todos los restaurantes de la Central
      // Obtener todos los restaurantes activos de la Central
      const restaurants = await (tx as any).restaurant.findMany({
        where: {
          centralId,
          isActive: true,
        },
        select: { id: true },
      });

      // Crear BranchProducts para cada restaurante
      if (restaurants.length > 0) {
        const branchProductsData = restaurants.map((restaurant: { id: string }) => ({
          restaurantId: restaurant.id,
          masterProductId: masterProduct.id,
          localPrice: null, // Usar precio base del master
          isLocallyActive: isGloballyAvailable, // Sincronizar disponibilidad
        }));

        await (tx as any).branchProduct.createMany({
          data: branchProductsData,
          skipDuplicates: true,
        });
      }

      return {
        masterProduct,
        restaurantsSynced: restaurants.length,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        masterProduct: result.masterProduct,
        restaurantsSynced: result.restaurantsSynced,
      },
    });
  } catch (error: any) {
    console.error('Error creating master product:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear producto maestro',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

