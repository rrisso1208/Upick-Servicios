/**
 * POST /api/admin/products/reorder - Update product order
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
    const { productId, direction } = body; // direction: 'up' | 'down'

    if (!productId || !direction) {
      return NextResponse.json(
        { success: false, error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    // Get current product
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
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

    // Get all products in the same category ordered by sort
    const allProducts = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        category: {
          restaurantId,
        },
      },
      orderBy: { sort: 'asc' },
    });

    const currentIndex = allProducts.findIndex((p) => p.id === productId);

    if (direction === 'up' && currentIndex > 0) {
      // Swap with previous
      const previousProduct = allProducts[currentIndex - 1];
      await prisma.$transaction([
        prisma.product.update({
          where: { id: productId },
          data: { sort: previousProduct.sort },
        }),
        prisma.product.update({
          where: { id: previousProduct.id },
          data: { sort: product.sort },
        }),
      ]);
    } else if (direction === 'down' && currentIndex < allProducts.length - 1) {
      // Swap with next
      const nextProduct = allProducts[currentIndex + 1];
      await prisma.$transaction([
        prisma.product.update({
          where: { id: productId },
          data: { sort: nextProduct.sort },
        }),
        prisma.product.update({
          where: { id: nextProduct.id },
          data: { sort: product.sort },
        }),
      ]);
    }

    return NextResponse.json({
      success: true,
      message: 'Orden actualizado',
    });
  } catch (error) {
    console.error('Error reordering products:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar orden' },
      { status: 500 }
    );
  }
}
