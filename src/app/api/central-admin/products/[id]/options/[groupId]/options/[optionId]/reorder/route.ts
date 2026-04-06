/**
 * PATCH /api/central-admin/products/:id/options/:groupId/options/:optionId/reorder - Reorder option
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../../../../../../lib/auth';

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

export async function PATCH(
  req: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; groupId: string; optionId: string }> }
) {
  try {
    const user = await getCentralAdminFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const centralId = user.centralId;
    const { id, groupId, optionId } = await params;

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

    // Verify option group belongs to product
    const optionGroup = await (prisma as any).masterOptionGroup.findFirst({
      where: {
        id: groupId,
        masterProductId: id,
      },
    });

    if (!optionGroup) {
      return NextResponse.json(
        { success: false, error: 'Especificación no encontrada' },
        { status: 404 }
      );
    }

    // Verify option belongs to group
    const option = await (prisma as any).masterOption.findFirst({
      where: {
        id: optionId,
        masterOptionGroupId: groupId,
      },
    });

    if (!option) {
      return NextResponse.json(
        { success: false, error: 'Opción no encontrada' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { direction } = body;

    if (!direction || (direction !== 'up' && direction !== 'down')) {
      return NextResponse.json(
        { success: false, error: 'Dirección inválida' },
        { status: 400 }
      );
    }

    // Get all options for this group, ordered by sort
    const allOptions = await (prisma as any).masterOption.findMany({
      where: { masterOptionGroupId: groupId },
      orderBy: { sort: 'asc' },
    });

    const currentIndex = allOptions.findIndex((o: any) => o.id === optionId);
    if (currentIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Opción no encontrada' },
        { status: 404 }
      );
    }

    // Check if we can move in the requested direction
    if (direction === 'up' && currentIndex === 0) {
      return NextResponse.json(
        { success: false, error: 'Ya está en la primera posición' },
        { status: 400 }
      );
    }

    if (direction === 'down' && currentIndex === allOptions.length - 1) {
      return NextResponse.json(
        { success: false, error: 'Ya está en la última posición' },
        { status: 400 }
      );
    }

    // Calculate new index
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetOption = allOptions[newIndex];

    // Swap sort values
    await prisma.$transaction([
      (prisma as any).masterOption.update({
        where: { id: optionId },
        data: { sort: targetOption.sort },
      }),
      (prisma as any).masterOption.update({
        where: { id: targetOption.id },
        data: { sort: option.sort },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Opción reordenada',
    });
  } catch (error) {
    console.error('Error reordering option:', error);
    return NextResponse.json(
      { success: false, error: 'Error al reordenar opción' },
      { status: 500 }
    );
  }
}

