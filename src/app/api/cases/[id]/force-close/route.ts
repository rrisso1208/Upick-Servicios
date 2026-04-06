/**
 * POST /api/cases/[id]/force-close - Force close a case (superadmin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let user;

    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      user = await getAuthUserFromHeader(authHeader);
    }

    if (!user) {
      user = await getAuthUser();
    }

    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verify case exists
    const caseItem = await prisma.case.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
      },
    });

    if (!caseItem) {
      return NextResponse.json(
        { success: false, error: 'Caso no encontrado' },
        { status: 404 }
      );
    }

    if (caseItem.status === 'CLOSED') {
      return NextResponse.json(
        { success: false, error: 'El caso ya está cerrado' },
        { status: 400 }
      );
    }

    // Force close the case
    const updated = await prisma.case.update({
      where: { id },
      data: {
        status: 'CLOSED',
        resolvedAt: new Date(),
        resolvedBy: user.id,
        forceClosed: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: { case: updated },
    });
  } catch (error) {
    console.error('Error force closing case:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al forzar cierre del caso',
      },
      { status: 500 }
    );
  }
}

