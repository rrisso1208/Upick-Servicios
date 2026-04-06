/**
 * PATCH /api/superadmin/food-categories/[id] - Update food category
 * DELETE /api/superadmin/food-categories/[id] - Delete food category
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(
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

    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, slug, icon, color, description, isActive, sort } = body;

    const category = await prisma.foodCategory.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(icon !== undefined && { icon: icon || null }),
        ...(color && { color }),
        ...(description !== undefined && { description: description || null }),
        ...(isActive !== undefined && { isActive }),
        ...(sort !== undefined && { sort }),
      },
    });

    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error: any) {
    console.error('Error updating food category:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        {
          success: false,
          error: 'Ya existe una categoría con ese nombre o slug',
        },
        { status: 400 }
      );
    }
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar categoría',
        details: String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Check if category has restaurants or products
    const category = await prisma.foodCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            restaurants: true,
            products: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }

    if (category._count.restaurants > 0 || category._count.products > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No se puede eliminar. Esta categoría está siendo usada por ${category._count.restaurants} restaurante(s) y ${category._count.products} producto(s).`,
        },
        { status: 400 }
      );
    }

    await prisma.foodCategory.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Categoría eliminada exitosamente',
    });
  } catch (error) {
    console.error('Error deleting food category:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al eliminar categoría',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
