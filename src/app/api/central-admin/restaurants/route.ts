/**
 * GET /api/central-admin/restaurants - Obtener restaurantes de la Central
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

async function getCentralAdminFromRequest(req: NextRequest) {
  const authHeader =
    req.headers.get('authorization') || req.headers.get('Authorization');
  let user;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    user = await getAuthUserFromHeader(authHeader);
  }

  if (!user) {
    user = await getAuthUser();
  }

  if (!user || (user.role as string) !== 'central_admin' || !(user as any).centralId) {
    return null;
  }

  return user as any;
}

/**
 * GET - Obtener restaurantes de la Central
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCentralAdminFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const centralId = user.centralId;

    const restaurants = await (prisma as any).restaurant.findMany({
      where: {
        centralId,
        isActive: true,
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
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        restaurants: restaurants.map((r: any) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          place: r.place,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error fetching restaurants:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener restaurantes',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

