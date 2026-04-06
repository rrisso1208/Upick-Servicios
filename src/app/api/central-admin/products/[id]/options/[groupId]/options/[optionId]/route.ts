/**
 * PATCH /api/central-admin/products/:id/options/:groupId/options/:optionId - Update option
 * DELETE /api/central-admin/products/:id/options/:groupId/options/:optionId - Delete option
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../../../../../lib/auth';
import { syncMasterOptionsToLocalProducts } from '../../../../../../../../../lib/central-sync';

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

    // Convert priceDelta to cents if provided
    let priceDeltaCents = option.priceDelta;
    if (body.priceDelta !== undefined) {
      priceDeltaCents = Math.round(
        (typeof body.priceDelta === 'string'
          ? parseFloat(body.priceDelta)
          : body.priceDelta) * 100
      );
    }

    const updated = await (prisma as any).masterOption.update({
      where: { id: optionId },
      data: {
        name: body.name?.trim(),
        priceDelta: priceDeltaCents,
        isDefault: body.isDefault,
        sort: body.sort,
        isActive: body.isActive,
      },
    });

    // Sincronizar opciones a productos locales
    await syncMasterOptionsToLocalProducts(id);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error updating option:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar opción' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    await (prisma as any).masterOption.delete({
      where: { id: optionId },
    });

    // Sincronizar opciones a productos locales (para eliminar opciones locales)
    await syncMasterOptionsToLocalProducts(id);

    return NextResponse.json({
      success: true,
      message: 'Opción eliminada',
    });
  } catch (error) {
    console.error('Error deleting option:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar opción' },
      { status: 500 }
    );
  }
}

