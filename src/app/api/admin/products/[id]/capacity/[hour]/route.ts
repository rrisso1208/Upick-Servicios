/**
 * DELETE /api/admin/products/:id/capacity/:hour - Delete product capacity
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/db';
import { getAdminRestaurant } from '../../../../../../../lib/admin-helpers';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; hour: string }> }
) {
  try {
    const restaurantId = await getAdminRestaurant(req);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id, hour } = await params;
    const hourNum = parseInt(hour);

    if (isNaN(hourNum) || hourNum < 0 || hourNum > 23) {
      return NextResponse.json(
        { success: false, error: 'Hora inválida' },
        { status: 400 }
      );
    }

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

    await prisma.productCapacity.delete({
      where: {
        restaurantId_productId_hour: {
          restaurantId,
          productId: id,
          hour: hourNum,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Capacidad eliminada',
    });
  } catch (error) {
    console.error('Error deleting capacity:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar capacidad' },
      { status: 500 }
    );
  }
}
