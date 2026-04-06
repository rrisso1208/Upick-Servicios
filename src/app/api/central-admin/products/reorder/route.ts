/**
 * POST /api/central-admin/products/reorder - Update master product order
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../lib/auth';

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

export async function POST(req: NextRequest) {
  try {
    const user = await getCentralAdminFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const centralId = user.centralId;
    const body = await req.json();
    const { productId, direction } = body; // direction: 'up' | 'down'

    if (!productId || !direction) {
      return NextResponse.json(
        { success: false, error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    // Get current product
    const product = await (prisma as any).masterProduct.findFirst({
      where: {
        id: productId,
        centralId,
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Get all products in the same category ordered by categorySort
    const allProducts = await (prisma as any).masterProduct.findMany({
      where: {
        masterCategoryId: product.masterCategoryId || null,
        centralId,
      },
      orderBy: { categorySort: 'asc' },
    });

    const currentIndex = allProducts.findIndex((p: any) => p.id === productId);

    if (direction === 'up' && currentIndex > 0) {
      // Swap with previous
      const previousProduct = allProducts[currentIndex - 1];
      await prisma.$transaction([
        (prisma as any).masterProduct.update({
          where: { id: productId },
          data: { categorySort: previousProduct.categorySort },
        }),
        (prisma as any).masterProduct.update({
          where: { id: previousProduct.id },
          data: { categorySort: product.categorySort },
        }),
      ]);
    } else if (direction === 'down' && currentIndex < allProducts.length - 1) {
      // Swap with next
      const nextProduct = allProducts[currentIndex + 1];
      await prisma.$transaction([
        (prisma as any).masterProduct.update({
          where: { id: productId },
          data: { categorySort: nextProduct.categorySort },
        }),
        (prisma as any).masterProduct.update({
          where: { id: nextProduct.id },
          data: { categorySort: product.categorySort },
        }),
      ]);
    }

    return NextResponse.json({
      success: true,
      message: 'Orden actualizado',
    });
  } catch (error) {
    console.error('Error reordering master products:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar orden' },
      { status: 500 }
    );
  }
}

