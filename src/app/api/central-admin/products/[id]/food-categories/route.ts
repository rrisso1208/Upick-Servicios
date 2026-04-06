/**
 * GET /api/central-admin/products/[id]/food-categories - Get food categories for a master product
 * PUT /api/central-admin/products/[id]/food-categories - Update product food categories
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../../lib/auth';
import { prisma } from '../../../../../../lib/db';

export const dynamic = 'force-dynamic';

async function getCentralAdminFromRequest(req: NextRequest) {
  const authHeader =
    req.headers.get('authorization') || req.headers.get('Authorization');
  let user;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    user = await getAuthUserFromHeader(authHeader);
  }

  if (!user) {
    user = await getAuthUser();
  }

  if (!user || (user.role as string) !== 'central_admin' || !(user as any).centralId) {
    return null;
  }

  return user as any;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCentralAdminFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const centralId = user.centralId;

    // Verify product belongs to central
    const product = await (prisma as any).masterProduct.findFirst({
      where: {
        id,
        centralId,
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Get product's food categories
    const productCategories = await (prisma as any).masterProductFoodCategory.findMany({
      where: { masterProductId: id },
      select: {
        foodCategoryId: true,
      },
    });

    const selectedCategoryIds = productCategories.map(
      (pc: any) => pc.foodCategoryId
    );

    return NextResponse.json({
      success: true,
      data: { selectedCategoryIds },
    });
  } catch (error) {
    console.error('Error fetching master product food categories:', error);
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
    const user = await getCentralAdminFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const centralId = user.centralId;

    // Verify product belongs to central
    const product = await (prisma as any).masterProduct.findFirst({
      where: {
        id,
        centralId,
      },
    });

    if (!product) {
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
      await (tx as any).masterProductFoodCategory.deleteMany({
        where: { masterProductId: id },
      });

      // Create new categories
      if (validCategoryIds.length > 0) {
        await (tx as any).masterProductFoodCategory.createMany({
          data: validCategoryIds.map((categoryId) => ({
            masterProductId: id,
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
    console.error('Error updating master product food categories:', error);
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

