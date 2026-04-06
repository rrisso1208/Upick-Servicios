/**
 * GET /api/central-admin/products/:id/options - Get master product option groups
 * POST /api/central-admin/products/:id/options - Create option group
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../../lib/auth';
import { syncMasterOptionsToLocalProducts } from '../../../../../../lib/central-sync';

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
    const user = await getCentralAdminFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const centralId = user.centralId;
    const { id } = await params;

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

    const optionGroups = await (prisma as any).masterOptionGroup.findMany({
      where: { masterProductId: id },
      include: {
        masterOptions: {
          orderBy: { sort: 'asc' },
        },
      },
      orderBy: { sort: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: { optionGroups },
    });
  } catch (error) {
    console.error('Error fetching option groups:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener especificaciones' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const { id } = await params;

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
    const { name, min, max, required, sort } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Nombre es requerido' },
        { status: 400 }
      );
    }

    // Get max sort value
    const maxSort = await (prisma as any).masterOptionGroup.findFirst({
      where: { masterProductId: id },
      orderBy: { sort: 'desc' },
      select: { sort: true },
    });

    const optionGroup = await (prisma as any).masterOptionGroup.create({
      data: {
        masterProductId: id,
        name: name.trim(),
        min: min ?? 0,
        max: max ?? 1,
        required: required === true,
        sort: sort ?? (maxSort?.sort ?? -1) + 1,
      },
      include: {
        masterOptions: true,
      },
    });

    // Sincronizar opciones a productos locales
    await syncMasterOptionsToLocalProducts(id);

    return NextResponse.json({
      success: true,
      data: optionGroup,
    });
  } catch (error) {
    console.error('Error creating option group:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear especificación' },
      { status: 500 }
    );
  }
}

