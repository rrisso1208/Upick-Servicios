/**
 * API endpoint para test de conexión POS
 * POST /api/admin/restaurant/pos/test-connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../../lib/auth';
import { testPOSConnection } from '../../../../../../lib/pos/posService';
import logger from '../../../../../../lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Autenticación
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization');
    let user;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      user = await getAuthUserFromHeader(authHeader);
    } else {
      user = await getAuthUser();
    }

    if (!user || (user.role as string) !== 'restaurant_admin') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener restaurantId del usuario
    const restaurant = await (
      await import('../../../../../../lib/db')
    ).prisma.restaurant.findFirst({
      where: {
        users: {
          some: {
            id: user.id,
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: 'Restaurante no encontrado' },
        { status: 404 }
      );
    }

    // Realizar test de conexión
    const result = await testPOSConnection(restaurant.id);

    logger.info(
      {
        restaurantId: restaurant.id,
        userId: user.id,
        success: result.success,
      },
      'Test de conexión POS realizado'
    );

    return NextResponse.json({
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error en test de conexión POS');
    return NextResponse.json(
      {
        success: false,
        error: 'Error al probar conexión con el POS',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
