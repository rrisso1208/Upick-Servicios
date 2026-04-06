/**
 * PATCH /api/superadmin/cases/[id] - Update case status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/db';
import { CaseStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await req.json();
    const { status, resolution } = body;

    if (!status || !Object.values(CaseStatus).includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Estado inválido' },
        { status: 400 }
      );
    }

    const updateData: any = {
      status: status as CaseStatus,
      updatedAt: new Date(),
    };

    if (status === 'RESOLVED' || status === 'CLOSED') {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = user.id;
      if (resolution) {
        updateData.resolution = resolution;
      }
    }

    const updatedCase = await prisma.case.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        order: {
          select: {
            id: true,
            pickupCode: true,
            totalAmount: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: { case: updatedCase },
    });
  } catch (error) {
    console.error('Error updating case:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar caso',
      },
      { status: 500 }
    );
  }
}

