import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cities
 * Returns all cities that have at least one active Place assigned
 */
export async function GET(req: NextRequest) {
  try {
    // Get cities that have at least one active Place
    const cities = await (prisma as any).city.findMany({
      where: {
        isActive: true,
        places: {
          some: {
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        name: true,
        code: true,
        _count: {
          select: {
            places: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      data: { cities },
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener ciudades',
      },
      { status: 500 }
    );
  }
}

