/**
 * POST /api/central-admin/sync-menu - Sincronizar menú maestro a restaurantes seleccionados
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../lib/auth';
import { syncBranchProductsToLocalProducts } from '../../../../lib/central-sync';

export const dynamic = 'force-dynamic';

async function getCentralAdminFromRequest(req: NextRequest) {
  const authHeader =
    req.headers.get('authorization') || req.headers.get('Authorization');
  let user;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    user = await getAuthUserFromHeader(authHeader);
  }

  if (!user) {
    user = await getAuthUser();
  }

  if (!user || (user.role as string) !== 'central_admin' || !(user as any).centralId) {
    return null;
  }

  return user as any;
}

/**
 * POST - Sincronizar menú maestro a restaurantes seleccionados
 * Body: {
 *   restaurantIds?: string[] // Si está vacío o no se envía, sincroniza todos los restaurantes
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCentralAdminFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const centralId = user.centralId;
    const body = await req.json();
    const { restaurantIds } = body;

    // Validar que restaurantIds sea un array si se proporciona
    if (restaurantIds !== undefined && !Array.isArray(restaurantIds)) {
      return NextResponse.json(
        { success: false, error: 'restaurantIds debe ser un array' },
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

    // Si se proporcionan restaurantIds, verificar que pertenecen a la Central
    if (restaurantIds && restaurantIds.length > 0) {
      const restaurants = await (prisma as any).restaurant.findMany({
        where: {
          id: { in: restaurantIds },
          centralId,
        },
        select: { id: true },
      });

      if (restaurants.length !== restaurantIds.length) {
        return NextResponse.json(
          { success: false, error: 'Algunos restaurantes no pertenecen a la Central' },
          { status: 400 }
        );
      }
    }

    // Ejecutar sincronización
    const result = await syncBranchProductsToLocalProducts(
      centralId,
      restaurantIds || [],
      undefined
    );

    return NextResponse.json({
      success: true,
      data: {
        synced: result.synced,
        skipped: result.skipped,
        errors: result.errors,
      },
    });
  } catch (error: any) {
    console.error('Error sincronizando menú:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al sincronizar menú',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

