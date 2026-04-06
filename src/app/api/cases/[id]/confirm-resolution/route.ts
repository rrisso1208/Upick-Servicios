/**
 * POST /api/cases/[id]/confirm-resolution - User confirms if case was resolved
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const confirmResolutionSchema = z.object({
  resolved: z.boolean(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    let user;

    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      user = await getAuthUserFromHeader(authHeader);
    }

    if (!user) {
      user = await getAuthUser();
    }

    if (!user || user.role !== 'student') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Validate input
    const validatedData = confirmResolutionSchema.parse(body);

    // Verify case exists and belongs to user
    const caseItem = await prisma.case.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        forceClosed: true,
      },
    });

    if (!caseItem) {
      return NextResponse.json(
        { success: false, error: 'Caso no encontrado' },
        { status: 404 }
      );
    }

    if (caseItem.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    if (caseItem.status === 'CLOSED') {
      return NextResponse.json(
        { success: false, error: 'El caso ya está cerrado' },
        { status: 400 }
      );
    }

    if (caseItem.status !== 'RESOLVED') {
      return NextResponse.json(
        { success: false, error: 'El caso debe estar resuelto para confirmar' },
        { status: 400 }
      );
    }

    if (caseItem.forceClosed) {
      return NextResponse.json(
        { success: false, error: 'Este caso fue cerrado forzosamente' },
        { status: 400 }
      );
    }

    if (validatedData.resolved) {
      // User confirms resolution - close the case
      const updated = await prisma.case.update({
        where: { id },
        data: {
          status: 'CLOSED',
          isResolvedByUser: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: { case: updated },
      });
    } else {
      // User says not resolved - reopen the case
      const updated = await prisma.case.update({
        where: { id },
        data: {
          status: 'IN_PROGRESS',
          resolvedAt: null,
          resolvedBy: null,
        },
      });

      return NextResponse.json({
        success: true,
        data: { case: updated },
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos inválidos',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error('Error confirming resolution:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al confirmar resolución',
      },
      { status: 500 }
    );
  }
}

