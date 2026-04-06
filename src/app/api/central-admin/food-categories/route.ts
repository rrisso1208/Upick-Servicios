/**
 * GET /api/central-admin/food-categories - Get food categories for central admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAuthUserFromHeader } from '../../../../lib/auth';
import { prisma } from '../../../../lib/db';

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

export async function GET(req: NextRequest) {
  try {
    const user = await getCentralAdminFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Get all active food categories
    const allCategories = await prisma.foodCategory.findMany({
      where: { isActive: true },
      orderBy: { sort: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        color: true,
        description: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        categories: allCategories,
      },
    });
  } catch (error) {
    console.error('Error fetching food categories:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener categorías',
        details: String(error),
      },
      { status: 500 }
    );
  }
}

