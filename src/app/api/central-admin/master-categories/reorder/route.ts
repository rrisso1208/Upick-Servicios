/**
 * POST /api/central-admin/master-categories/reorder - Update master category order
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
    const { categoryId, direction } = body; // direction: 'up' | 'down'

    if (!categoryId || !direction) {
      return NextResponse.json(
        { success: false, error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    // Get current category
    const category = await (prisma as any).masterCategory.findFirst({
      where: {
        id: categoryId,
        centralId,
      },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }

    // Get all categories ordered by sort
    const allCategories = await (prisma as any).masterCategory.findMany({
      where: { centralId },
      orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
    });

    const currentIndex = allCategories.findIndex((c: any) => c.id === categoryId);

    if (currentIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Categoría no encontrada en la lista' },
        { status: 404 }
      );
    }

    if (direction === 'up' && currentIndex > 0) {
      // Swap with previous
      const previousCategory = allCategories[currentIndex - 1];

      const updates = allCategories.map((cat: any, idx: number) => {
        if (idx === currentIndex - 1) {
          return (prisma as any).masterCategory.update({
            where: { id: cat.id },
            data: { sort: currentIndex },
          });
        } else if (idx === currentIndex) {
          return (prisma as any).masterCategory.update({
            where: { id: cat.id },
            data: { sort: currentIndex - 1 },
          });
        } else {
          return (prisma as any).masterCategory.update({
            where: { id: cat.id },
            data: { sort: idx },
          });
        }
      });

      await prisma.$transaction(updates);
    } else if (
      direction === 'down' &&
      currentIndex < allCategories.length - 1
    ) {
      // Swap with next
      const nextCategory = allCategories[currentIndex + 1];

      const updates = allCategories.map((cat: any, idx: number) => {
        if (idx === currentIndex) {
          return (prisma as any).masterCategory.update({
            where: { id: cat.id },
            data: { sort: currentIndex + 1 },
          });
        } else if (idx === currentIndex + 1) {
          return (prisma as any).masterCategory.update({
            where: { id: cat.id },
            data: { sort: currentIndex },
          });
        } else {
          return (prisma as any).masterCategory.update({
            where: { id: cat.id },
            data: { sort: idx },
          });
        }
      });

      await prisma.$transaction(updates);
    } else {
      // Already at the limit
      return NextResponse.json({
        success: true,
        message: 'Orden actualizado',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Orden actualizado',
    });
  } catch (error) {
    console.error('Error reordering master categories:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar orden' },
      { status: 500 }
    );
  }
}

