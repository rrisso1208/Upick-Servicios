/**
 * PATCH /api/admin/products/:id/options/:groupId - Update option group
 * DELETE /api/admin/products/:id/options/:groupId - Delete option group
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/db';
import { getAdminRestaurant } from '../../../../../../../lib/admin-helpers';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  try {
    const restaurantId = await getAdminRestaurant(req);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id, groupId } = await params;

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

    const body = await req.json();

    const updated = await prisma.productOptionGroup.update({
      where: { id: groupId },
      data: {
        name: body.name?.trim(),
        min: body.min,
        max: body.max,
        required: body.required,
        sort: body.sort,
      },
      include: {
        options: {
          orderBy: { sort: 'asc' },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error updating option group:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar especificación' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  try {
    const restaurantId = await getAdminRestaurant(req);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id, groupId } = await params;

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

    await prisma.productOptionGroup.delete({
      where: { id: groupId },
    });

    return NextResponse.json({
      success: true,
      message: 'Especificación eliminada',
    });
  } catch (error) {
    console.error('Error deleting option group:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar especificación' },
      { status: 500 }
    );
  }
}
