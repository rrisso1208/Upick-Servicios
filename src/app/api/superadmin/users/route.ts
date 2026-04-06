/**
 * GET /api/superadmin/users - Get all users with filters
 * PATCH /api/superadmin/users/[id] - Update user
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const roleFilter = searchParams.get('role');
    const placeId = searchParams.get('placeId');
    const restaurantId = searchParams.get('restaurantId');
    const isActiveFilter = searchParams.get('isActive');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    const sortBy = searchParams.get('sortBy'); // orders | credits | createdAt
    const sortOrder =
      searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    // 🔹 WHERE dinámico
    const where: any = {};

    if (roleFilter) where.role = roleFilter;
    if (placeId) where.placeId = placeId;
    if (restaurantId) where.restaurantId = restaurantId;

    if (isActiveFilter !== null && isActiveFilter !== undefined) {
      where.isActive = isActiveFilter === 'true';
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 🔥 Estados válidos
    const VALID_STATUSES = ['paid', 'in_progress', 'ready', 'delivered'];

    // 🔹 1. GROUP BY pedidos
    const orderCounts = await prisma.order.groupBy({
      by: ['studentId'], // ⚠️ asegúrate que este campo sea correcto
      where: {
        status: {
          in: ['paid', 'in_progress', 'ready', 'delivered'],
        },
      },
      _count: {
        studentId: true,
      },
    });

    // 🔹 2. MAPA de conteos
    const orderCountMap = new Map<string, number>();

    orderCounts.forEach((item) => {
      orderCountMap.set(item.studentId, item._count.studentId);
    });

    // 🔹 3. ORDER BY dinámico (solo DB)
    let orderBy: any = { createdAt: 'desc' };

    if (sortBy === 'credits') {
      orderBy = {
        credits: {
          balance: sortOrder,
        },
      };
    }

    if (sortBy === 'createdAt') {
      orderBy = {
        createdAt: sortOrder,
      };
    }

    // 🔹 4. TRAER usuarios
    let users = await prisma.user.findMany({
      where,
      include: {
        place: { select: { id: true, name: true } },
        restaurant: { select: { id: true, name: true } },
        credits: { select: { balance: true } },
      },
      orderBy,
    });

    // 🔹 5. MERGE con conteo de pedidos
    let usersWithOrders = users.map((user) => ({
      ...user,
      _count: {
        orders: orderCountMap.get(user.id) || 0,
      },
    }));

    // 🔥 6. SORT POR PEDIDOS (memoria)
    if (sortBy === 'orders') {
      usersWithOrders.sort((a, b) =>
        sortOrder === 'asc'
          ? a._count.orders - b._count.orders
          : b._count.orders - a._count.orders
      );
    }

    // 🔥 7. PAGINACIÓN (DESPUÉS de ordenar)
    const start = offset ? parseInt(offset) : 0;
    const end = limit ? start + parseInt(limit) : undefined;

    const finalUsers = usersWithOrders.slice(start, end);

    // 🔹 TOTAL
    const total = await prisma.user.count({ where });

    return NextResponse.json({
      success: true,
      data: {
        users: finalUsers,
        total,
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);

    return NextResponse.json(
      { success: false, error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}