import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getAuthUser } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/superadmin/cities
 * Returns all cities (for superadmin to assign to places)
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate superadmin
    let user = await getAuthUser();
    if (!user) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        // Use eval to bypass TypeScript type checking for this function
        const getAuthUserFromHeader = (await import('../../../../lib/auth')).getAuthUserFromHeader;
        user = await (getAuthUserFromHeader as any)(authHeader);
      }
    }

    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Get all active cities
    const cities = await (prisma as any).city.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
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

