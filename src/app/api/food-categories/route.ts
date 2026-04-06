/**
 * GET /api/food-categories - Get all active food categories
 */

import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categories = await prisma.foodCategory.findMany({
      where: { isActive: true },
      orderBy: { sort: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        color: true,
        description: true,
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
        error: 'Error al obtener categorías de comida',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
