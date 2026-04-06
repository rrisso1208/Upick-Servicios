/**
 * POST /api/admin/products/check-capacity
 * Check and update product availability based on capacity
 * This should be called periodically (every minute) to auto-disable/enable products
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

    const now = new Date();
    const currentHour = now.getHours();
    const currentDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    // Get all products with capacities for current hour
    const productsWithCapacities = await prisma.product.findMany({
      where: {
        restaurantId,
        isActive: true,
        capacities: {
          some: {
            hour: currentHour,
          },
        },
      },
      include: {
        capacities: {
          where: {
            hour: currentHour,
          },
        },
      },
    });

    const updates = [];

    for (const product of productsWithCapacities) {
      const capacity = product.capacities[0];
      if (!capacity || capacity.capacity <= 0) continue;

      // Count orders for this product in this hour
      const ordersInHour = await prisma.orderItem.count({
        where: {
          productId: product.id,
          order: {
            restaurantId,
            pickupSlotStart: {
              gte: new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                currentDate.getDate(),
                currentHour,
                0,
                0
              ),
              lt: new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                currentDate.getDate(),
                currentHour + 1,
                0,
                0
              ),
            },
            status: {
              in: ['awaiting_payment', 'paid', 'in_progress', 'ready'],
            },
          },
        },
      });

      // If capacity reached, check if product should be disabled
      if (ordersInHour >= capacity.capacity) {
        // Check if product was disabled more than 10 minutes ago
        // If so, reactivate it (capacity resets)
        const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

        // For simplicity, we'll just disable the product when capacity is reached
        // The product will be re-enabled when the hour changes or manually
        if (product.isActive) {
          updates.push(
            prisma.product.update({
              where: { id: product.id },
              data: { isActive: false },
            })
          );
        }
      } else {
        // If capacity not reached and product is disabled, reactivate
        if (!product.isActive) {
          updates.push(
            prisma.product.update({
              where: { id: product.id },
              data: { isActive: true },
            })
          );
        }
      }
    }

    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }

    return NextResponse.json({
      success: true,
      message: `Verificadas ${productsWithCapacities.length} productos, ${updates.length} actualizados`,
    });
  } catch (error) {
    console.error('Error checking capacity:', error);
    return NextResponse.json(
      { success: false, error: 'Error al verificar capacidad' },
      { status: 500 }
    );
  }
}
