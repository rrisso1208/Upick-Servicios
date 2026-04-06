/**
 * POST /api/admin/products/:id/options/:groupId/options - Create option
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../../lib/db';
import { getAdminRestaurant } from '../../../../../../../../lib/admin-helpers';

export const dynamic = 'force-dynamic';

export async function POST(
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
    const { name, priceDelta, isDefault, sort } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Nombre es requerido' },
        { status: 400 }
      );
    }

    // Get max sort value
    const maxSort = await prisma.productOption.findFirst({
      where: { groupId },
      orderBy: { sort: 'desc' },
      select: { sort: true },
    });

    // Convert priceDelta to cents if provided
    const priceDeltaCents = priceDelta
      ? Math.round(
          (typeof priceDelta === 'string'
            ? parseFloat(priceDelta)
            : priceDelta) * 100
        )
      : 0;

    const option = await prisma.productOption.create({
      data: {
        groupId,
        name: name.trim(),
        priceDelta: priceDeltaCents,
        isDefault: isDefault === true,
        sort: sort ?? (maxSort?.sort ?? -1) + 1,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: option,
    });
  } catch (error) {
    console.error('Error creating option:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear opción' },
      { status: 500 }
    );
  }
}
