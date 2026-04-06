/**
 * PATCH /api/central-admin/master-categories/[id] - Actualizar categoría maestra
 * DELETE /api/central-admin/master-categories/[id] - Eliminar categoría maestra
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

export async function PATCH(
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
    const body = await req.json();
    const { name, description, saleHoursStart, saleHoursEnd, sort } = body;

    const existing = await (prisma as any).masterCategory.findUnique({
      where: { id },
    });

    if (!existing || existing.centralId !== centralId) {
      return NextResponse.json(
        { success: false, error: 'Categoría no encontrada o no autorizada' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description || null;
    if (saleHoursStart !== undefined)
      updateData.saleHoursStart = saleHoursStart || null;
    if (saleHoursEnd !== undefined)
      updateData.saleHoursEnd = saleHoursEnd || null;
    if (sort !== undefined) updateData.sort = sort;

    const category = await (prisma as any).masterCategory.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: { category },
    });
  } catch (error: any) {
    console.error('Error updating master category:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar categoría maestra',
        details: error.message,
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
    const user = await getCentralAdminFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const centralId = user.centralId;
    const { id } = await params;

    const existing = await (prisma as any).masterCategory.findUnique({
      where: { id },
    });

    if (!existing || existing.centralId !== centralId) {
      return NextResponse.json(
        { success: false, error: 'Categoría no encontrada o no autorizada' },
        { status: 404 }
      );
    }

    await (prisma as any).masterCategory.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Categoría eliminada exitosamente',
    });
  } catch (error: any) {
    console.error('Error deleting master category:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al eliminar categoría maestra',
        details: error.message,
      },
      { status: 500 }
    );
  }
}


