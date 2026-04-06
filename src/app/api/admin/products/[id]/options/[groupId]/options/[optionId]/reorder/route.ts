/**
 * PATCH /api/admin/products/:id/options/:groupId/options/:optionId/reorder - Reorder option
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../../../../lib/db';
import { getAdminRestaurant } from '../../../../../../../../../../lib/admin-helpers';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; groupId: string; optionId: string }> }
) {
  try {
    const restaurantId = await getAdminRestaurant(req);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id, groupId, optionId } = await params;

    // Verify product belongs to restaurant
    const product = await prisma.product.findFirst({
      where: {
        id,
        category: {
          restaurantId,
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Verify option group belongs to product
    const optionGroup = await prisma.productOptionGroup.findFirst({
      where: {
        id: groupId,
        productId: id,
      },
    });

    if (!optionGroup) {
      return NextResponse.json(
        { success: false, error: 'Especificación no encontrada' },
        { status: 404 }
      );
    }

    // Verify option belongs to group
    const option = await prisma.productOption.findFirst({
      where: {
        id: optionId,
        groupId,
      },
    });

    if (!option) {
      return NextResponse.json(
        { success: false, error: 'Opción no encontrada' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { direction } = body;

    if (!direction || (direction !== 'up' && direction !== 'down')) {
      return NextResponse.json(
        { success: false, error: 'Dirección inválida' },
        { status: 400 }
      );
    }

    // Get all options for this group, ordered by sort
    const allOptions = await prisma.productOption.findMany({
      where: { groupId },
      orderBy: { sort: 'asc' },
    });

    const currentIndex = allOptions.findIndex((o) => o.id === optionId);
    if (currentIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Opción no encontrada' },
        { status: 404 }
      );
    }

    // Check if we can move in the requested direction
    if (direction === 'up' && currentIndex === 0) {
      return NextResponse.json(
        { success: false, error: 'Ya está en la primera posición' },
        { status: 400 }
      );
    }

    if (direction === 'down' && currentIndex === allOptions.length - 1) {
      return NextResponse.json(
        { success: false, error: 'Ya está en la última posición' },
        { status: 400 }
      );
    }

    // Calculate new index
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetOption = allOptions[newIndex];

    // Swap sort values
    await prisma.$transaction([
      prisma.productOption.update({
        where: { id: optionId },
        data: { sort: targetOption.sort },
      }),
      prisma.productOption.update({
        where: { id: targetOption.id },
        data: { sort: option.sort },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Opción reordenada',
    });
  } catch (error) {
    console.error('Error reordering option:', error);
    return NextResponse.json(
      { success: false, error: 'Error al reordenar opción' },
      { status: 500 }
    );
  }
}

