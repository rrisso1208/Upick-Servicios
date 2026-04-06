/**
 * GET /api/admin/food-categories - Get food categories for restaurant admin
 * PUT /api/admin/food-categories - Update restaurant food categories
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAuthUserFromHeader } from '../../../../lib/auth';
import { prisma } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
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

    // Get all active food categories
    const allCategories = await prisma.foodCategory.findMany({
      where: { isActive: true },
      orderBy: { sort: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        color: true,
        description: true,
      },
    });

    // Get restaurant's selected categories
    const restaurantCategories = await prisma.restaurantFoodCategory.findMany({
      where: { restaurantId: user.restaurantId },
      select: {
        foodCategoryId: true,
      },
    });

    const selectedCategoryIds = restaurantCategories.map(
      (rc) => rc.foodCategoryId
    );

    return NextResponse.json({
      success: true,
      data: {
        categories: allCategories,
        selectedCategoryIds,
      },
    });
  } catch (error) {
    console.error('Error fetching food categories:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener categorías',
        details: String(error),
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
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
      select: { id: true, name: true },
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

    // Validate that each category has at least one product that justifies it
    const validationResults = await Promise.all(
      validCategoryIds.map(async (categoryId) => {
        const productCount = await prisma.productFoodCategory.count({
          where: {
            foodCategoryId: categoryId,
            product: {
              restaurantId: user.restaurantId!,
              isActive: true,
            },
          },
        });
        return {
          categoryId,
          categoryName:
            validCategories.find((c) => c.id === categoryId)?.name || '',
          hasProducts: productCount > 0,
          productCount,
        };
      })
    );

    const categoriesWithoutProducts = validationResults.filter(
      (r) => !r.hasProducts
    );

    // Use transaction to update categories
    await prisma.$transaction(async (tx) => {
      // Delete existing categories
      await tx.restaurantFoodCategory.deleteMany({
        where: { restaurantId: user.restaurantId },
      });

      // Create new categories
      if (validCategoryIds.length > 0) {
        await tx.restaurantFoodCategory.createMany({
          data: validCategoryIds.map((categoryId) => ({
            restaurantId: user.restaurantId!,
            foodCategoryId: categoryId,
          })),
        });
      }
    });

    // Return success with warnings if any category lacks products
    if (categoriesWithoutProducts.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Categorías actualizadas exitosamente',
        warning: `Las siguientes categorías no tienen productos que las justifiquen: ${categoriesWithoutProducts.map((c) => c.categoryName).join(', ')}. Por favor, asigna productos a estas categorías editando cada producto.`,
        categoriesWithoutProducts: categoriesWithoutProducts.map((c) => ({
          id: c.categoryId,
          name: c.categoryName,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Categorías actualizadas exitosamente',
    });
  } catch (error) {
    console.error('Error updating food categories:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar categorías',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
