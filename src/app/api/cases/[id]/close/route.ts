/**
 * POST /api/cases/[id]/close - Close a case (superadmin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const closeCaseSchema = z.object({
  resolution: z.string().optional(),
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

    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Validate input
    const validatedData = closeCaseSchema.parse(body);

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

    // Update case to RESOLVED (user will confirm and then it becomes CLOSED)
    const updateData: any = {
      status: 'RESOLVED',
      resolvedAt: new Date(),
      resolvedBy: user.id,
    };

    if (validatedData.resolution) {
      updateData.resolution = validatedData.resolution;
    }

    const updated = await prisma.case.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: { case: updated },
    });
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

    console.error('Error closing case:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al cerrar caso',
      },
      { status: 500 }
    );
  }
}

