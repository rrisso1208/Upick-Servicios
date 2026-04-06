/**
 * GET /api/admin/restaurant-context
 * Devuelve el tipo de negocio (PlaceType) del restaurante del admin autenticado.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getAdminRestaurant } from '../../../../lib/admin-helpers';

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

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, type: true, name: true },
    });

    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: 'Restaurante no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        restaurantId: restaurant.id,
        name: restaurant.name,
        type: restaurant.type,
      },
    });
  } catch (error) {
    console.error('restaurant-context error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener contexto' },
      { status: 500 }
    );
  }
}
