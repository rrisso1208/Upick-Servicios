/**
 * PATCH /api/admin/products/:id/options/:groupId/options/:optionId - Update option
 * DELETE /api/admin/products/:id/options/:groupId/options/:optionId - Delete option
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../../../lib/db';
import { getAdminRestaurant } from '../../../../../../../../../lib/admin-helpers';

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

    // Convert priceDelta to cents if provided
    let priceDeltaCents = option.priceDelta;
    if (body.priceDelta !== undefined) {
      priceDeltaCents = Math.round(
        (typeof body.priceDelta === 'string'
          ? parseFloat(body.priceDelta)
          : body.priceDelta) * 100
      );
    }

    const updated = await prisma.productOption.update({
      where: { id: optionId },
      data: {
        name: body.name?.trim(),
        priceDelta: priceDeltaCents,
        isDefault: body.isDefault,
        sort: body.sort,
        isActive: body.isActive,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error updating option:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar opción' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    await prisma.productOption.delete({
      where: { id: optionId },
    });

    return NextResponse.json({
      success: true,
      message: 'Opción eliminada',
    });
  } catch (error) {
    console.error('Error deleting option:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar opción' },
      { status: 500 }
    );
  }
}
