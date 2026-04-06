/**
 * API Endpoint: Obtener historial de sincronizaciones de menú
 * GET /api/admin/restaurant/menu/sync-history
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminRestaurant } from '../../../../../../lib/admin-helpers';
import { prisma } from '../../../../../../lib/db';
import logger from '../../../../../../lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const restaurantId = await getAdminRestaurant(req);
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const history = await prisma.menuSyncHistory.findMany({
      where: { restaurantId },
      orderBy: { syncedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.menuSyncHistory.count({
      where: { restaurantId },
    });

    return NextResponse.json({
      success: true,
      data: {
        history,
        total,
        limit,
        offset,
      },
    });
  } catch (error: any) {
    logger.error({ error }, 'Error en API de historial de sincronizaciones');
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
