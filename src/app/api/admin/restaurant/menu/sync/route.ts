/**
 * API Endpoint: Re-sincronizar menú desde POS
 * POST /api/admin/restaurant/menu/sync
 * Re-sincroniza el menú usando la configuración POS guardada del restaurante
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminRestaurant } from '../../../../../../lib/admin-helpers';
import { resyncMenuFromPOS } from '../../../../../../lib/pos/menuSyncService';
import logger from '../../../../../../lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const restaurantId = await getAdminRestaurant(req);
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    logger.info(
      { restaurantId },
      'Iniciando re-sincronización de menú desde POS'
    );

    const result = await resyncMenuFromPOS(restaurantId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        data: {
          imported: result.imported,
          updated: result.updated,
          changes: result.changes, // Incluir cambios detectados
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: result.message,
          errors: result.errors,
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    logger.error({ error }, 'Error en API de sincronización de menú');
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
