/**
 * GET /api/central-admin/badges - Get all available badges for central admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const badges = await prisma.badge.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ sort: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      data: { badges },
    });
  } catch (error) {
    console.error('Error fetching badges:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener medallas' },
      { status: 500 }
    );
  }
}


