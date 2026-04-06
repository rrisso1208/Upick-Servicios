/**
 * GET /api/central-admin/filters
 * Obtener ciudades y lugares disponibles para filtrar en el dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
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
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const centralId = (user as any).centralId;

    // Obtener restaurantes de la Central
    const restaurants = await (prisma as any).restaurant.findMany({
      where: {
        centralId,
        isActive: true,
      },
      select: {
        placeId: true,
      },
    });

    const placeIds = restaurants.map((r: any) => r.placeId);

    if (placeIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          cities: [],
          places: [],
        },
      });
    }

    // Obtener lugares únicos con sus ciudades
    const places = await prisma.place.findMany({
      where: {
        id: { in: placeIds },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        cityId: true,
        city: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Obtener ciudades únicas
    const cityIds = [...new Set(places.map((p) => p.cityId).filter(Boolean))];
    const cities = cityIds.length > 0
      ? await (prisma as any).city.findMany({
          where: {
            id: { in: cityIds },
            isActive: true,
          },
          select: {
            id: true,
            name: true,
          },
          orderBy: {
            name: 'asc',
          },
        })
      : [];

    return NextResponse.json({
      success: true,
      data: {
        cities,
        places: places.map((p) => ({
          id: p.id,
          name: p.name,
          cityId: p.cityId,
          city: p.city,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching filters:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener filtros' },
      { status: 500 }
    );
  }
}

