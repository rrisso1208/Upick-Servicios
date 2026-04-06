/**
 * GET /api/superadmin/restaurants/metrics - Get quick metrics for all restaurants
 *
 * ✅ FIX:
 * - Solo cuenta estados válidos: paid, in_progress, ready, delivered
 * - revenueMonth = ventas reales del restaurante = totalAmount - serviceFeeAmount
 * - commissionMonth = comisión recalculada sobre baseRestaurant (sin fee)
 * - Auth: solo superadmin
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../lib/auth';

export const dynamic = 'force-dynamic';

const VALID_SALE_STATUSES = ['paid', 'delivered', 'in_progress', 'ready'] as const;

export async function GET(req: NextRequest) {
  try {
    // ✅ Auth superadmin (igual que otros endpoints)
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization');
    let user: any = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      user = await getAuthUserFromHeader(authHeader);
    }
    if (!user) user = await getAuthUser();

    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const restaurantIds = searchParams.get('restaurantIds'); // Comma-separated IDs

    if (!restaurantIds) {
      return NextResponse.json(
        { success: false, error: 'restaurantIds parameter is required' },
        { status: 400 }
      );
    }

    const ids = restaurantIds.split(',').map((s) => s.trim()).filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'restaurantIds is empty' },
        { status: 400 }
      );
    }

    // Rango hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Rango mes actual
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    // Traer comisión por restaurante (1 query, más barato)
    const restaurants = await prisma.restaurant.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        commissionPercentage: true,
        commissionIvaPayer: true,
      },
    });

    const restaurantInfo = new Map<
      string,
      { commissionPercentage: number; commissionIvaPayer: any }
    >();

    restaurants.forEach((r) => {
      restaurantInfo.set(r.id, {
        commissionPercentage: Number(r.commissionPercentage ?? 5.0),
        commissionIvaPayer: r.commissionIvaPayer,
      });
    });

    // Órdenes de hoy (solo contar)
    const todayOrders = await prisma.order.findMany({
      where: {
        restaurantId: { in: ids },
        createdAt: { gte: today, lt: tomorrow },
        status: { in: [...VALID_SALE_STATUSES] },
      },
      select: { restaurantId: true },
    });

    // Órdenes del mes (para ventas/commission)
    const monthOrders = await prisma.order.findMany({
      where: {
        restaurantId: { in: ids },
        createdAt: { gte: monthStart, lte: monthEnd },
        status: { in: [...VALID_SALE_STATUSES] },
      },
      select: {
        restaurantId: true,
        totalAmount: true,
        serviceFeeAmount: true,
      },
    });

    // Importar calculadora (misma lógica que ya tienes)
    const { calculateRestaurantCommission } = await import(
      '../../../../../lib/restaurant-commission'
      );

    // Inicializar
    const metricsMap = new Map<
      string,
      { ordersToday: number; revenueMonth: number; commissionMonth: number }
    >();

    ids.forEach((id) => {
      metricsMap.set(id, { ordersToday: 0, revenueMonth: 0, commissionMonth: 0 });
    });

    // Contar pedidos de hoy
    todayOrders.forEach((o) => {
      const m = metricsMap.get(o.restaurantId);
      if (m) m.ordersToday += 1;
    });

    // Ventas + comisión del mes (correctas)
    monthOrders.forEach((o) => {
      const m = metricsMap.get(o.restaurantId);
      if (!m) return;

      const info = restaurantInfo.get(o.restaurantId);
      const commissionPercentage = info?.commissionPercentage ?? 5.0;
      const commissionIvaPayer = info?.commissionIvaPayer;

      const serviceFee = o.serviceFeeAmount || 0;

      // ✅ Venta real del restaurante (sin fee)
      const baseRestaurant = Math.max(0, (o.totalAmount || 0) - serviceFee);
      m.revenueMonth += baseRestaurant;

      // ✅ Comisión correcta (sobre baseRestaurant)
      const { platformCommissionAmount } = calculateRestaurantCommission(
        baseRestaurant,
        commissionPercentage,
        commissionIvaPayer
      );

      m.commissionMonth += platformCommissionAmount || 0;
    });

    // Convertir a objeto
    const metrics: Record<
      string,
      { ordersToday: number; revenueMonth: number; commissionMonth: number }
    > = {};

    metricsMap.forEach((value, key) => {
      metrics[key] = value;
    });

    return NextResponse.json({
      success: true,
      data: { metrics },
    });
  } catch (error) {
    console.error('Error fetching restaurant metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener métricas' },
      { status: 500 }
    );
  }
}
