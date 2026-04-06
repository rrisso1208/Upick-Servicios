/**
 * POST /api/admin/categories/reorder - Update category order
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

    const body = await req.json();
    const { categoryId, direction } = body; // direction: 'up' | 'down'

    if (!categoryId || !direction) {
      return NextResponse.json(
        { success: false, error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    // Get current category
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        restaurantId,
      },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }

    // Get all categories ordered by sort, then by createdAt for consistent ordering
    const allCategories = await prisma.category.findMany({
      where: { restaurantId, isActive: true },
      orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
    });

    const currentIndex = allCategories.findIndex((c) => c.id === categoryId);

    if (currentIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Categoría no encontrada en la lista' },
        { status: 404 }
      );
    }

    if (direction === 'up' && currentIndex > 0) {
      // Swap with previous - reassign all sort values sequentially to avoid conflicts
      const previousCategory = allCategories[currentIndex - 1];

      // Reassign sort values sequentially starting from 0
      const updates = allCategories.map((cat, idx) => {
        if (idx === currentIndex - 1) {
          // Previous category gets current position
          return prisma.category.update({
            where: { id: cat.id },
            data: { sort: currentIndex },
          });
        } else if (idx === currentIndex) {
          // Current category gets previous position
          return prisma.category.update({
            where: { id: cat.id },
            data: { sort: currentIndex - 1 },
          });
        } else {
          // Other categories keep their relative position
          return prisma.category.update({
            where: { id: cat.id },
            data: { sort: idx },
          });
        }
      });

      await prisma.$transaction(updates);
    } else if (
      direction === 'down' &&
      currentIndex < allCategories.length - 1
    ) {
      // Swap with next - reassign all sort values sequentially to avoid conflicts
      const nextCategory = allCategories[currentIndex + 1];

      // Reassign sort values sequentially starting from 0
      const updates = allCategories.map((cat, idx) => {
        if (idx === currentIndex) {
          // Current category gets next position
          return prisma.category.update({
            where: { id: cat.id },
            data: { sort: currentIndex + 1 },
          });
        } else if (idx === currentIndex + 1) {
          // Next category gets current position
          return prisma.category.update({
            where: { id: cat.id },
            data: { sort: currentIndex },
          });
        } else {
          // Other categories keep their relative position
          return prisma.category.update({
            where: { id: cat.id },
            data: { sort: idx },
          });
        }
      });

      await prisma.$transaction(updates);
    } else {
      // Already at the limit, no change needed
      return NextResponse.json({
        success: true,
        message: 'Orden actualizado',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Orden actualizado',
    });
  } catch (error) {
    console.error('Error reordering categories:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar orden' },
      { status: 500 }
    );
  }
}
