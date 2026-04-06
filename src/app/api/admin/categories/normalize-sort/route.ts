/**
 * POST /api/admin/categories/normalize-sort
 * Normalize sort values for all categories (assign sequential values)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getAdminRestaurant } from '../../../../../lib/admin-helpers';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const restaurantId = await getAdminRestaurant(req);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Get all categories ordered by current sort, then by createdAt
    const categories = await prisma.category.findMany({
      where: { restaurantId, isActive: true },
      orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
    });

    // Normalize sort values sequentially
    const updates = categories.map((category, index) =>
      prisma.category.update({
        where: { id: category.id },
        data: { sort: index },
      })
    );

    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }

    return NextResponse.json({
      success: true,
      message: `Normalizados ${updates.length} categorías`,
    });
  } catch (error) {
    console.error('Error normalizing sort:', error);
    return NextResponse.json(
      { success: false, error: 'Error al normalizar orden' },
      { status: 500 }
    );
  }
}
