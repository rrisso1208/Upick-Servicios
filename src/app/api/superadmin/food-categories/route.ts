/**
 * GET /api/superadmin/food-categories - Get all food categories
 * POST /api/superadmin/food-categories - Create food category
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAuthUserFromHeader } from '../../../../lib/auth';
import { prisma } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
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

    const categories = await prisma.foodCategory.findMany({
      orderBy: { sort: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        color: true,
        description: true,
        isActive: true,
        sort: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            restaurants: true,
            products: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    console.error('Error fetching food categories:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener categorías',
        details: String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
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

    if (!name || !slug) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    const category = await prisma.foodCategory.create({
      data: {
        name,
        slug,
        icon: icon || null,
        color: color || 'primary',
        description: description || null,
        isActive: isActive !== undefined ? isActive : true,
        sort: sort || 0,
      },
    });

    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error: any) {
    console.error('Error creating food category:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        {
          success: false,
          error: 'Ya existe una categoría con ese nombre o slug',
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear categoría',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
