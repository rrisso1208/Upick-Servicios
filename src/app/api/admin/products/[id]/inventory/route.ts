/**
 * PATCH /api/admin/products/[id]/inventory
 * Update product inventory settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db';
import { getAdminRestaurant } from '../../../../../../lib/admin-helpers';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateInventorySchema = z.object({
  inventoryEnabled: z.boolean().optional(),
  inventoryQuantity: z.number().int().min(0).nullable().optional(),
  inventoryAlertThreshold: z.number().int().min(0).nullable().optional(),
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
    const product = await prisma.product.findFirst({
      where: {
        id,
        restaurantId,
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // If disabling inventory, set quantity and threshold to null
    const updateData: any = {};

    if (validatedData.inventoryEnabled !== undefined) {
      updateData.inventoryEnabled = validatedData.inventoryEnabled;

      if (!validatedData.inventoryEnabled) {
        // Disabling inventory - clear quantity and threshold
        updateData.inventoryQuantity = null;
        updateData.inventoryAlertThreshold = null;
      }
    }

    if (validatedData.inventoryQuantity !== undefined) {
      updateData.inventoryQuantity = validatedData.inventoryQuantity;
    }

    if (validatedData.inventoryAlertThreshold !== undefined) {
      updateData.inventoryAlertThreshold =
        validatedData.inventoryAlertThreshold;
    }

    // Update product
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        inventoryEnabled: true,
        inventoryQuantity: true,
        inventoryAlertThreshold: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedProduct,
    });
  } catch (error) {
    console.error('Error updating inventory:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Error al actualizar inventario' },
      { status: 500 }
    );
  }
}
