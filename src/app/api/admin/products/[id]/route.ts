/**
 * PATCH /api/admin/products/:id - Update product
 * DELETE /api/admin/products/:id - Delete product
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getAdminRestaurant } from '../../../../../lib/admin-helpers';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

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

    // Verify product belongs to restaurant
    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        category: {
          restaurantId,
        },
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // If updating category, verify it belongs to restaurant
    if (body.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: body.categoryId,
          restaurantId,
        },
      });

      if (!category) {
        return NextResponse.json(
          { success: false, error: 'Categoría no válida' },
          { status: 400 }
        );
      }
    }

    // Convert price to cents if provided
    if (body.price !== undefined) {
      const priceNum =
        typeof body.price === 'string' ? parseFloat(body.price) : body.price;
      body.price = Math.round(priceNum * 100);
    }

    // Convert promotionPrice to cents if provided
    if (body.promotionPrice !== undefined && body.promotionPrice !== null) {
      const promoPriceNum =
        typeof body.promotionPrice === 'string'
          ? parseFloat(body.promotionPrice)
          : body.promotionPrice;
      body.promotionPrice =
        promoPriceNum > 0 ? Math.round(promoPriceNum * 100) : null;
    }

    // Handle boolean conversion for isFeatured
    if (body.isFeatured !== undefined) {
      body.isFeatured = body.isFeatured === true || body.isFeatured === 'true';
    }

    // Handle imagePosition and imageScale
    if (body.imagePosition !== undefined) {
      body.imagePosition = body.imagePosition || 'center';
    }
    if (body.imageScale !== undefined) {
      body.imageScale = body.imageScale || 1.0;
    }

    // Handle inventory fields
    if (body.inventoryEnabled !== undefined) {
      body.inventoryEnabled =
        body.inventoryEnabled === true || body.inventoryEnabled === 'true';
      // If disabling inventory, clear quantity and threshold
      if (!body.inventoryEnabled) {
        body.inventoryQuantity = null;
        body.inventoryAlertThreshold = null;
      }
    }
    if (body.inventoryQuantity !== undefined) {
      body.inventoryQuantity =
        body.inventoryQuantity !== null && body.inventoryQuantity !== ''
          ? parseInt(String(body.inventoryQuantity))
          : null;
    }
    if (body.inventoryAlertThreshold !== undefined) {
      body.inventoryAlertThreshold =
        body.inventoryAlertThreshold !== null &&
        body.inventoryAlertThreshold !== ''
          ? parseInt(String(body.inventoryAlertThreshold))
          : null;
    }

    const product = await prisma.product.update({
      where: { id },
      data: body,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar producto' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Producto eliminado',
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar producto' },
      { status: 500 }
    );
  }
}
