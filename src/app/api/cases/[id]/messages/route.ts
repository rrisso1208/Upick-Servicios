/**
 * GET /api/cases/[id]/messages - Get messages for a case
 * POST /api/cases/[id]/messages - Send a message in a case
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const sendMessageSchema = z.object({
  message: z.string().min(1).max(5000),
});

export async function GET(
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

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verify case exists and user has access
    const caseItem = await prisma.case.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
      },
    });

    if (!caseItem) {
      return NextResponse.json(
        { success: false, error: 'Caso no encontrado' },
        { status: 404 }
      );
    }

    // Only case owner (student) or superadmin can access
    if (user.role !== 'superadmin' && caseItem.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Get messages
    const messages = await prisma.caseMessage.findMany({
      where: { caseId: id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Mark messages as read for the current user
    await prisma.caseMessage.updateMany({
      where: {
        caseId: id,
        userId: { not: user.id },
        isRead: false,
      },
      data: { isRead: true },
    });

    return NextResponse.json({
      success: true,
      data: { messages },
    });
  } catch (error) {
    console.error('Error fetching case messages:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener mensajes',
      },
      { status: 500 }
    );
  }
}

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

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Validate input
    const validatedData = sendMessageSchema.parse(body);

    // Verify case exists and user has access
    const caseItem = await prisma.case.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
      },
    });

    if (!caseItem) {
      return NextResponse.json(
        { success: false, error: 'Caso no encontrado' },
        { status: 404 }
      );
    }

    // Only case owner (student) or superadmin can send messages
    if (user.role !== 'superadmin' && caseItem.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Don't allow messages if case is closed (unless superadmin)
    if (caseItem.status === 'CLOSED' && user.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'No se pueden enviar mensajes a un caso cerrado' },
        { status: 400 }
      );
    }

    // Create message
    const message = await prisma.caseMessage.create({
      data: {
        caseId: id,
        userId: user.id,
        message: validatedData.message,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    // If case is OPEN and superadmin sends message, update to IN_PROGRESS
    if (caseItem.status === 'OPEN' && user.role === 'superadmin') {
      await prisma.case.update({
        where: { id },
        data: { status: 'IN_PROGRESS' },
      });
    }

    return NextResponse.json({
      success: true,
      data: { message },
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

    console.error('Error sending case message:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al enviar mensaje',
      },
      { status: 500 }
    );
  }
}

