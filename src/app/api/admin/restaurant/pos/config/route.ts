/**
 * API endpoint para obtener y actualizar configuración POS
 * GET /api/admin/restaurant/pos/config
 * PATCH /api/admin/restaurant/pos/config
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../../lib/auth';
import { prisma } from '../../../../../../lib/db';
import { getRestaurantPOSConfig } from '../../../../../../lib/pos/posService';
import { POSType, POSCredentials } from '../../../../../../lib/pos/types';
import logger from '../../../../../../lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Obtener configuración POS del restaurante
 */
export async function GET(req: NextRequest) {
  try {
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

    const restaurant = await prisma.restaurant.findFirst({
      where: {
        users: {
          some: {
            id: user.id,
          },
        },
      },
      select: {
        id: true,
        posType: true,
        posEnabled: true,
        posCredentials: true,
        posLastTestAt: true,
        posLastTestResult: true,
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: 'Restaurante no encontrado' },
        { status: 404 }
      );
    }

    const config = await getRestaurantPOSConfig(restaurant.id);

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error obteniendo configuración POS');
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener configuración POS',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Actualizar configuración POS del restaurante
 */
export async function PATCH(req: NextRequest) {
  try {
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

    const body = await req.json();
    const { posType, posEnabled, posCredentials } = body;

    const restaurant = await prisma.restaurant.findFirst({
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

    // Validar posType si se proporciona
    if (posType !== undefined && posType !== null) {
      const validPOSTypes: POSType[] = [
        'vendty',
        'siigo',
        'softrestaurant',
        'loggro',
        'loyverse',
        'toteat',
        'restaurantepos',
      ];
      if (!validPOSTypes.includes(posType)) {
        return NextResponse.json(
          {
            success: false,
            error: `Tipo de POS inválido. Debe ser uno de: ${validPOSTypes.join(', ')}`,
          },
          { status: 400 }
        );
      }
    }

    // Actualizar configuración
    const updateData: any = {};
    if (posType !== undefined) updateData.posType = posType;
    if (posEnabled !== undefined) updateData.posEnabled = posEnabled;
    if (posCredentials !== undefined)
      updateData.posCredentials = posCredentials as POSCredentials;

    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: updateData,
    });

    logger.info(
      {
        restaurantId: restaurant.id,
        userId: user.id,
        posType,
        posEnabled,
      },
      'Configuración POS actualizada'
    );

    return NextResponse.json({
      success: true,
      message: 'Configuración POS actualizada exitosamente',
    });
  } catch (error: any) {
    logger.error({ error }, 'Error actualizando configuración POS');
    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar configuración POS',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
