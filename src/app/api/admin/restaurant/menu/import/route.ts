/**
 * API Endpoint: Importar menú desde POS
 * POST /api/admin/restaurant/menu/import
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminRestaurant } from '../../../../../../lib/admin-helpers';
import { importMenuFromPOS } from '../../../../../../lib/pos/menuSyncService';
import { POSType, POSCredentials } from '../../../../../../lib/pos/types';
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

    const body = await req.json();
    const { posType, credentials } = body;

    if (!posType || !credentials) {
      return NextResponse.json(
        {
          success: false,
          error: 'Faltan parámetros requeridos (posType, credentials)',
        },
        { status: 400 }
      );
    }

    logger.info(
      { restaurantId, posType },
      'Iniciando importación de menú desde POS'
    );

    const result = await importMenuFromPOS(
      restaurantId,
      posType as POSType,
      credentials as POSCredentials
    );

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
    logger.error({ error }, 'Error en API de importación de menú');
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
