/**
 * GET /api/superadmin/cases - Get all cases for superadmin
 * PATCH /api/superadmin/cases/[id] - Update case status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAuthUserFromHeader } from '../../../../lib/auth';
import { prisma } from '../../../../lib/db';
import { CaseStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Try to get user from Authorization header first (for client-side requests)
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    let user = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      user = await getAuthUserFromHeader(authHeader);
    }

    // Fallback to cookie-based auth if header auth failed
    if (!user) {
      user = await getAuthUser();
    }

    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as CaseStatus | null;
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const cases = await prisma.case.findMany({
      where,
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
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        order: {
          select: {
            id: true,
            pickupCode: true,
            totalAmount: true,
            createdAt: true,
            cancellation: {
              select: {
                refundAmount: true,
                refundType: true,
                reason: true,
              },
            },
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
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

