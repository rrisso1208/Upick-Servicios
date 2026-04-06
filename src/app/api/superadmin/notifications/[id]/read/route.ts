/**
 * PATCH /api/superadmin/notifications/[id]/read - Mark notification as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../../lib/auth';
import { prisma } from '../../../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Try getting user from header first, then from cookies
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization');
    let user;

    if (authHeader && authHeader.startsWith('Bearer ')) {
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

    const notification = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al marcar notificación como leída',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
