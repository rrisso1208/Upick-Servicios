/**
 * PATCH /api/central-admin/products/:id/options/:groupId - Update option group
 * DELETE /api/central-admin/products/:id/options/:groupId - Delete option group
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../../../lib/auth';
import { syncMasterOptionsToLocalProducts } from '../../../../../../../lib/central-sync';

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
  { params }: { params: Promise<{ id: string; groupId: string }> }
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
    const { id, groupId } = await params;

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

    const body = await req.json();

    const updated = await (prisma as any).masterOptionGroup.update({
      where: { id: groupId },
      data: {
        name: body.name?.trim(),
        min: body.min,
        max: body.max,
        required: body.required,
        sort: body.sort,
      },
      include: {
        masterOptions: {
          orderBy: { sort: 'asc' },
        },
      },
    });

    // Sincronizar opciones a productos locales
    await syncMasterOptionsToLocalProducts(id);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error updating option group:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar especificación' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> }
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
    const { id, groupId } = await params;

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

    await (prisma as any).masterOptionGroup.delete({
      where: { id: groupId },
    });

    // Sincronizar opciones a productos locales (para eliminar grupos locales)
    await syncMasterOptionsToLocalProducts(id);

    return NextResponse.json({
      success: true,
      message: 'Especificación eliminada',
    });
  } catch (error) {
    console.error('Error deleting option group:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar especificación' },
      { status: 500 }
    );
  }
}

