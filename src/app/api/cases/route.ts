/**
 * GET /api/cases - Get cases for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAuthUserFromHeader } from '../../../lib/auth';
import { prisma } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Try to get user from Authorization header first (for client-side requests)
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    let user;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      user = await getAuthUserFromHeader(authHeader);
    } else {
      // Fallback to cookie-based auth (for server-side requests)
      user = await getAuthUser();
    }

    if (!user || user.role !== 'student') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const cases = await prisma.case.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        caseNumber: true,
        type: true,
        status: true,
        title: true,
        description: true,
        resolution: true,
        createdAt: true,
        resolvedAt: true,
        forceClosed: true,
        order: {
          select: {
            id: true,
            pickupCode: true,
            totalAmount: true,
            createdAt: true,
            restaurant: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: { cases },
    });
  } catch (error) {
    console.error('Error fetching cases:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener casos',
      },
      { status: 500 }
    );
  }
}

