/**
 * GET /api/admin/products/[id]/food-categories - Get food categories for a product
 * PUT /api/admin/products/[id]/food-categories - Update product food categories
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../../lib/auth';
import { prisma } from '../../../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let user;

    // Try to get from Authorization header first
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      user = await getAuthUserFromHeader(authHeader);
    }

    // Fallback to cookie-based auth
    if (!user) {
      user = await getAuthUser();
    }

    if (!user || user.role !== 'restaurant_admin' || !user.restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verify product belongs to user's restaurant
    const product = await prisma.product.findUnique({
      where: { id },
      select: { restaurantId: true },
    });

    if (!product || product.restaurantId !== user.restaurantId) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Get product's food categories
    const productCategories = await prisma.productFoodCategory.findMany({
      where: { productId: id },
      select: {
        foodCategoryId: true,
      },
    });

    const selectedCategoryIds = productCategories.map(
      (pc) => pc.foodCategoryId
    );

    return NextResponse.json({
      success: true,
      data: { selectedCategoryIds },
    });
  } catch (error) {
    console.error('Error fetching product food categories:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener categorías del producto',
        details: String(error),
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let user;

    // Try to get from Authorization header first
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      user = await getAuthUserFromHeader(authHeader);
    }

    // Fallback to cookie-based auth
    if (!user) {
      user = await getAuthUser();
    }

    if (!user || user.role !== 'restaurant_admin' || !user.restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verify product belongs to user's restaurant
    const product = await prisma.product.findUnique({
      where: { id },
      select: { restaurantId: true },
    });

    if (!product || product.restaurantId !== user.restaurantId) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { categoryIds } = body;

    if (!Array.isArray(categoryIds)) {
      return NextResponse.json(
        { success: false, error: 'categoryIds debe ser un array' },
        { status: 400 }
      );
    }

    // Validate that all category IDs exist and are active
    const validCategories = await prisma.foodCategory.findMany({
      where: {
        id: { in: categoryIds },
        isActive: true,
      },
      select: { id: true },
    });

    const validCategoryIds = validCategories.map((c) => c.id);
    const invalidIds = categoryIds.filter(
      (id) => !validCategoryIds.includes(id)
    );

    if (invalidIds.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Categorías inválidas: ${invalidIds.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Use transaction to update categories
    await prisma.$transaction(async (tx) => {
      // Delete existing categories
      await tx.productFoodCategory.deleteMany({
        where: { productId: id },
      });

      // Create new categories
      if (validCategoryIds.length > 0) {
        await tx.productFoodCategory.createMany({
          data: validCategoryIds.map((categoryId) => ({
            productId: id,
            foodCategoryId: categoryId,
          })),
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Categorías del producto actualizadas exitosamente',
    });
  } catch (error) {
    console.error('Error updating product food categories:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar categorías del producto',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
