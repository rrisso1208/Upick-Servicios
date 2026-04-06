/**
 * PATCH /api/admin/inventory/[id] - Update inventory quantity for a product
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminRestaurant } from '../../../../../lib/admin-helpers';
import { prisma } from '../../../../../lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateInventorySchema = z.object({
  quantity: z.number().int().min(0),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const restaurantId = await getAdminRestaurant(req);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    // Validate input
    const validatedData = updateInventorySchema.parse(body);

    // Verify product belongs to restaurant
    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        restaurantId: true,
        inventoryEnabled: true,
        inventoryAlertThreshold: true,
        name: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    if (product.restaurantId !== restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    if (!product.inventoryEnabled) {
      return NextResponse.json(
        { success: false, error: 'El inventario no está habilitado para este producto' },
        { status: 400 }
      );
    }

    // Update inventory quantity
    const updated = await prisma.product.update({
      where: { id },
      data: {
        inventoryQuantity: validatedData.quantity,
      },
    });

    // If inventory is now above threshold, resolve any active alerts
    // This should happen regardless of the previous quantity
    if (
      product.inventoryAlertThreshold !== null &&
      validatedData.quantity > product.inventoryAlertThreshold
    ) {
      await prisma.inventoryAlert.updateMany({
        where: {
          productId: id,
          isResolved: false,
        },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos inválidos',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error('Error updating inventory:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar inventario',
      },
      { status: 500 }
    );
  }
}

