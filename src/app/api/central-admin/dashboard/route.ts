/**
 * GET /api/central-admin/dashboard
 * Dashboard del Admin de Central con métricas agregadas
 * 
 * Query params:
 * - dateFrom: YYYY-MM-DD
 * - dateTo: YYYY-MM-DD
 * - cityId: ID de la ciudad (opcional)
 * - placeId: ID del Hub específico (opcional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization');
    let user;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      user = await getAuthUserFromHeader(authHeader);
    }

    if (!user) {
      user = await getAuthUser();
    }

    if (!user || (user.role as string) !== 'central_admin' || !(user as any).centralId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const cityId = searchParams.get('cityId');
    const placeId = searchParams.get('placeId');

    // Construir filtro de fechas
    const dateFilter: any = {};
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      dateFilter.gte = fromDate;
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.lte = toDate;
    }

    // Construir filtro de restaurantes
    const restaurantFilter: any = {
      centralId: (user as any).centralId,
      isActive: true,
    };

    if (placeId) {
      restaurantFilter.placeId = placeId;
    } else if (cityId) {
      // Filtrar por ciudad a través del Place
      restaurantFilter.place = {
        cityId,
        isActive: true,
      };
    }

    // Obtener todos los restaurantes de la Central con filtros
    const restaurants = await (prisma as any).restaurant.findMany({
      where: restaurantFilter,
      select: {
        id: true,
        name: true,
        slug: true,
        place: {
          select: {
            id: true,
            name: true,
            city: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const restaurantIds = restaurants.map((r: any) => r.id);

    if (restaurantIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalSales: 0,
          totalOrders: 0,
          averageTicket: 0,
          restaurants: [],
        },
      });
    }

    // Construir filtro de órdenes
    const orderFilter: any = {
      restaurantId: { in: restaurantIds },
      status: {
        in: ['paid', 'in_progress', 'ready', 'delivered'],
      },
    };

    if (Object.keys(dateFilter).length > 0) {
      orderFilter.createdAt = dateFilter;
    }

    // Obtener órdenes con datos financieros
    const orders = await (prisma as any).order.findMany({
      where: orderFilter,
      select: {
        id: true,
        restaurantId: true,
        totalAmount: true,
        serviceFeeAmount: true,
        discountAmount: true,
        createdAt: true,
      },
    }) as Array<{
      id: string;
      restaurantId: string;
      totalAmount: number;
      serviceFeeAmount: number | null;
      discountAmount: number;
      createdAt: Date;
    }>;

    // Calcular métricas globales
    const totalSales = orders.reduce((sum, order) => {
      // Excluir serviceFeeAmount del revenue del restaurante
      return sum + (order.totalAmount - (order.serviceFeeAmount || 0));
    }, 0);

    const totalOrders = orders.length;
    const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Calcular métricas por restaurante
    const restaurantMetrics = restaurants.map((restaurant: any) => {
      const restaurantOrders = orders.filter(
        (o) => o.restaurantId === restaurant.id
      );

      const restaurantSales = restaurantOrders.reduce((sum: number, order: any) => {
        return sum + (order.totalAmount - (order.serviceFeeAmount || 0));
      }, 0);

      const restaurantOrderCount = restaurantOrders.length;
      const restaurantAverageTicket =
        restaurantOrderCount > 0 ? restaurantSales / restaurantOrderCount : 0;

      return {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        place: restaurant.place,
        sales: restaurantSales,
        orderCount: restaurantOrderCount,
        averageTicket: restaurantAverageTicket,
      };
    });

    // Ordenar por ventas (ranking)
    restaurantMetrics.sort((a: any, b: any) => b.sales - a.sales);

    return NextResponse.json({
      success: true,
      data: {
        totalSales,
        totalOrders,
        averageTicket,
        restaurants: restaurantMetrics,
      },
    });
  } catch (error) {
    console.error('Error fetching central admin dashboard:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener métricas' },
      { status: 500 }
    );
  }
}

