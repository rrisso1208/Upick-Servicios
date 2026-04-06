/**
 * GET /api/delivery-points
 * Get delivery points for a place (Hub)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const placeId = searchParams.get('placeId');

    if (!placeId) {
      return NextResponse.json(
        { success: false, error: 'placeId es requerido' },
        { status: 400 }
      );
    }

    const points = await prisma.deliveryPoint.findMany({
      where: {
        placeId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        category: true,
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: {
        points,
      },
    });
  } catch (error) {
    console.error('Error fetching delivery points:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener puntos de entrega' },
      { status: 500 }
    );
  }
}

