/**
 * API Endpoint: Sincronización automática de menús (Cron Job)
 * GET /api/cron/sync-menus
 *
 * Este endpoint debe ser llamado por un cron job externo (Vercel Cron, etc.)
 * O puede ser configurado como tarea programada en el servidor
 *
 * Seguridad: Debe estar protegido con un secret token
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncAllRestaurantMenus } from '../../../../lib/pos/menuSyncService';
import logger from '../../../../lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Verificar token de seguridad (opcional pero recomendado)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    logger.info('Iniciando sincronización automática de menús (cron job)');

    const result = await syncAllRestaurantMenus();

    return NextResponse.json({
      success: true,
      message: `Sincronización completada: ${result.successful}/${result.total} exitosas`,
      data: result,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error en cron job de sincronización de menús');
    return NextResponse.json(
      {
        success: false,
        error: 'Error en sincronización automática',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
