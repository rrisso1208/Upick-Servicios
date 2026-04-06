/**
 * GET /api/admin/inventory - Get all inventory items with alerts
 * PATCH /api/admin/inventory/[id] - Update inventory quantity
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminRestaurant } from '../../../../lib/admin-helpers';
import { prisma } from '../../../../lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateInventorySchema = z.object({
  quantity: z.number().int().min(0),
});

export async function GET(req: NextRequest) {
  try {
    const restaurantId = await getAdminRestaurant(req);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Get all products with inventory enabled
    const products = await prisma.product.findMany({
      where: {
        restaurantId,
        inventoryEnabled: true,
      },
      select: {
        id: true,
        name: true,
        inventoryQuantity: true,
        inventoryAlertThreshold: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Get active inventory alerts
    const alerts = await prisma.inventoryAlert.findMany({
      where: {
        restaurantId,
        isResolved: false,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        products,
        alerts,
      },
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener inventario',
      },
      { status: 500 }
    );
  }
}

