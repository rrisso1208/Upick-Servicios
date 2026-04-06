/**
 * GET /api/superadmin/notifications - Get notifications for superadmin
 * PATCH /api/superadmin/notifications/[id]/read - Mark notification as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAuthUserFromHeader } from '../../../../lib/auth';
import { prisma } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Try to get user from Authorization header first
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization');
    let user;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      user = await getAuthUserFromHeader(authHeader);
    }

    // Fallback to cookie-based auth
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
    const isRead = searchParams.get('isRead'); // 'true', 'false', or null for all
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const clientName = searchParams.get('clientName');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    
    // IMPORTANT: Exclude inventory notifications - those are only for restaurant admins
    // Superadmin should only see system-wide notifications
    where.type = {
      not: 'INVENTORY_LOW',
    };
    
    // Filter by read status
    if (isRead === 'true') {
      where.isRead = true;
    } else if (isRead === 'false') {
      where.isRead = false;
    }
    
    // Filter by date range
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999); // Include entire day
        where.createdAt.lte = toDate;
      }
    }
    
    // Get all notifications first (we'll filter by client name in memory if needed)
    let notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit * 2, // Get more to filter in memory
    });

    // Filter by client name (search in metadata and message)
    if (clientName) {
      const searchTerm = clientName.toLowerCase();
      notifications = notifications.filter((notification) => {
        const metadata = notification.metadata as any;
        const customerName = metadata?.customerName?.toLowerCase() || '';
        const userEmail = metadata?.userEmail?.toLowerCase() || '';
        const message = notification.message?.toLowerCase() || '';
        
        return (
          customerName.includes(searchTerm) ||
          userEmail.includes(searchTerm) ||
          message.includes(searchTerm)
        );
      });
    }

    // Limit results after filtering
    notifications = notifications.slice(0, limit);

    console.log(`[NotificationsAPI] Fetched ${notifications.length} notifications for user ${user.email} (Role: ${user.role})`);
    console.log(`[NotificationsAPI] Where clause:`, JSON.stringify(where));

    const unreadCount = await prisma.notification.count({
      where: { isRead: false },
    });

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener notificaciones',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
