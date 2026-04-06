/**
 * GET /api/central-admin/master-categories - Listar categorías maestras de la Central
 * POST /api/central-admin/master-categories - Crear categoría maestra
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../lib/auth';

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

export async function GET(req: NextRequest) {
  try {
    const user = await getCentralAdminFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const centralId = user.centralId;

    const categories = await (prisma as any).masterCategory.findMany({
      where: {
        centralId,
      },
      orderBy: {
        sort: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    console.error('Error fetching master categories:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener categorías maestras' },
      { status: 500 }
    );
  }
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
    const { name, description, saleHoursStart, saleHoursEnd, sort = 0 } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'El nombre de la categoría es requerido' },
        { status: 400 }
      );
    }

    const category = await (prisma as any).masterCategory.create({
      data: {
        centralId,
        name,
        description: description || null,
        saleHoursStart: saleHoursStart || null,
        saleHoursEnd: saleHoursEnd || null,
        sort,
      },
    });

    return NextResponse.json({
      success: true,
      data: { category },
    });
  } catch (error: any) {
    console.error('Error creating master category:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear categoría maestra',
        details: error.message,
      },
      { status: 500 }
    );
  }
}


