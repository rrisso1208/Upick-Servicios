/**
 * GET /api/admin/restaurant-id - Get restaurant ID for authenticated admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAuthUserFromHeader } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    let user;

    // Try to get from Authorization header first
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      user = await getAuthUserFromHeader(authHeader);
    }

    // Fallback to cookie-based auth
    if (!user) {
      user = await getAuthUser();
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado. Por favor inicia sesión.' },
        { status: 401 }
      );
    }

    if (user.role !== 'restaurant_admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'No tienes permisos de administrador de restaurante.',
        },
        { status: 403 }
      );
    }

    if (!user.restaurantId) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No tienes un restaurante asignado. Contacta al superadmin para que te asigne un restaurante.',
          needsAssignment: true,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { restaurantId: user.restaurantId },
    });
  } catch (error) {
    console.error('Error getting restaurant ID:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener restaurante',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
