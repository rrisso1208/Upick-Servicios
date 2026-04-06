/**
 * POST /api/central-admin/products/:id/options/:groupId/options - Create option
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../../../../lib/auth';
import { syncMasterOptionsToLocalProducts } from '../../../../../../../../lib/central-sync';

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

export async function POST(
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
    const { name, priceDelta, isDefault, sort } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Nombre es requerido' },
        { status: 400 }
      );
    }

    // Get max sort value
    const maxSort = await (prisma as any).masterOption.findFirst({
      where: { masterOptionGroupId: groupId },
      orderBy: { sort: 'desc' },
      select: { sort: true },
    });

    // Convert priceDelta to cents if provided
    const priceDeltaCents = priceDelta
      ? Math.round(
          (typeof priceDelta === 'string'
            ? parseFloat(priceDelta)
            : priceDelta) * 100
        )
      : 0;

    const option = await (prisma as any).masterOption.create({
      data: {
        masterOptionGroupId: groupId,
        name: name.trim(),
        priceDelta: priceDeltaCents,
        isDefault: isDefault === true,
        sort: sort ?? (maxSort?.sort ?? -1) + 1,
        isActive: true,
      },
    });

    // Sincronizar opciones a productos locales
    await syncMasterOptionsToLocalProducts(id);

    return NextResponse.json({
      success: true,
      data: option,
    });
  } catch (error) {
    console.error('Error creating option:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear opción' },
      { status: 500 }
    );
  }
}

