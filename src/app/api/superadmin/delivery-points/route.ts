/**
 * GET /api/superadmin/delivery-points
 * POST /api/superadmin/delivery-points
 * Get all delivery points or create new ones (with bulk upload support)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    let user;
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      user = await getAuthUserFromHeader(authHeader);
    }
    if (!user) {
      user = await getAuthUser();
    }

    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const placeId = searchParams.get('placeId');

    const where: any = {};
    if (placeId) {
      where.placeId = placeId;
    }

    const points = await prisma.deliveryPoint.findMany({
      where,
      include: {
        place: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
      orderBy: [
        { place: { name: 'asc' } },
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

export async function POST(req: NextRequest) {
  try {
    let user;
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      user = await getAuthUserFromHeader(authHeader);
    }
    if (!user) {
      user = await getAuthUser();
    }

    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { points, placeId } = body;

    // Support both single point and bulk upload
    const pointsToCreate = Array.isArray(points) ? points : [points];

    if (!pointsToCreate || pointsToCreate.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Debes proporcionar al menos un punto de entrega' },
        { status: 400 }
      );
    }

    // Validate all points
    for (const point of pointsToCreate) {
      if (!point.name || !point.name.trim()) {
        return NextResponse.json(
          { success: false, error: 'Todos los puntos deben tener un nombre' },
          { status: 400 }
        );
      }
      if (!point.placeId && !placeId) {
        return NextResponse.json(
          { success: false, error: 'Todos los puntos deben tener un placeId' },
          { status: 400 }
        );
      }
    }

    // Create points
    const createdPoints = await Promise.all(
      pointsToCreate.map((point: any) =>
        prisma.deliveryPoint.create({
          data: {
            placeId: point.placeId || placeId,
            name: point.name.trim(),
            category: point.category?.trim() || null,
            isActive: point.isActive !== undefined ? point.isActive : true,
          },
          include: {
            place: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      data: {
        points: createdPoints,
        count: createdPoints.length,
      },
    });
  } catch (error: any) {
    console.error('Error creating delivery points:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al crear puntos de entrega',
      },
      { status: 500 }
    );
  }
}

