/**
 * GET /api/admin/export - Export summary metrics (CSV)
 *
 * Exporta SOLO:
 * - Num pedidos
 * - Ticket promedio
 * - Horas pico
 * - Productos más vendidos
 *
 * ✅ Misma lógica que /api/admin/metrics:
 * - Excluye: awaiting_payment, cancelled, refunded
 * - Revenue restaurante = totalAmount - serviceFeeAmount
 * - Horas pico: top 3 por createdAt hour
 * - Top products: usa product.price (más robusto) * quantity
 *
 * ✅ Incluye BOM UTF-8 para que Excel no rompa tildes/ñ
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getAdminRestaurant } from '../../../../lib/admin-helpers';

export const dynamic = 'force-dynamic';

function csvCell(value: unknown) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  const needsQuotes = /[",\n\r]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export async function GET(req: NextRequest) {
  try {
    const restaurantId = await getAdminRestaurant(req);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'today';

    // Rango de fechas (igual estilo que /api/admin/metrics)
    const now = new Date();
    const startDate = new Date();
    const endDate = new Date();

    if (period === 'today') {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'month') {
      startDate.setMonth(now.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // fallback seguro
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    }

    // ✅ Traer pedidos con mismas reglas de exclusión que metrics
    // Usamos include para evitar errores de types y asegurar campos
    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: {
          gte: startDate,
          ...(period === 'today' ? { lte: endDate } : {}),
        },
        status: {
          notIn: ['awaiting_payment', 'cancelled', 'refunded'],
        },
      },
      select: {
        totalAmount: true,
        serviceFeeAmount: true,
        createdAt: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true, // ✅ robusto para revenue de producto
              },
            },
          },
        },
      } as any,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // ----------------------------
    // 1) Num pedidos
    // ----------------------------
    const totalOrders = orders.length;

    // ----------------------------
    // 2) Ticket promedio (revenue restaurante = total - serviceFee)
    // ----------------------------
    const totalRevenueRestaurant = orders.reduce((sum: number, o: any) => {
      const serviceFee = o.serviceFeeAmount || 0;
      const restaurantRevenue = (o.totalAmount || 0) - serviceFee;
      return sum + restaurantRevenue;
    }, 0);

    const averageTicket =
      totalOrders > 0
        ? Math.max(0, Math.round(totalRevenueRestaurant / totalOrders))
        : 0;

    // ----------------------------
    // 3) Horas pico (top 3)
    // ----------------------------
    const ordersByHour: Record<number, number> = {};
    orders.forEach((o: any) => {
      const hour = new Date(o.createdAt).getHours();
      ordersByHour[hour] = (ordersByHour[hour] || 0) + 1;
    });

    const peakHours = Object.entries(ordersByHour)
      .map(([hour, count]) => ({ hour: Number(hour), count: Number(count) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((h) => `${h.hour}:00`);

    // ----------------------------
    // 4) Productos más vendidos (top 5)
    // revenue estimada = product.price * quantity
    // ----------------------------
    const productSales: Record<
      string,
      { name: string; quantity: number; revenue: number }
    > = {};

    orders.forEach((o: any) => {
      o.items.forEach((it: any) => {
        const pid = it.product.id as string;
        if (!productSales[pid]) {
          productSales[pid] = {
            name: it.product.name as string,
            quantity: 0,
            revenue: 0,
          };
        }
        productSales[pid].quantity += it.quantity || 0;
        productSales[pid].revenue += (it.product.price || 0) * (it.quantity || 0);
      });
    });

    const topProducts = Object.values(productSales)
      .map((p) => ({
        ...p,
        quantity: Math.max(0, p.quantity),
        revenue: Math.max(0, p.revenue),
      }))
      .filter((p) => p.quantity > 0 && p.revenue >= 0)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // ----------------------------
    // CSV output
    // - 1er bloque: resumen
    // - 2do bloque: top products
    // ----------------------------
    const rows: string[] = [];

    rows.push(['Periodo', 'Num Pedidos', 'Ticket Promedio', 'Horas Pico'].join(','));
    rows.push(
      [
        csvCell(period),
        csvCell(totalOrders),
        // ticket promedio en pesos (si guardas centavos)
        csvCell((averageTicket / 100).toFixed(2)),
        csvCell(peakHours.join(' | ')),
      ].join(',')
    );

    rows.push(''); // línea en blanco

    rows.push(['Productos más vendidos', 'Unidades', 'Revenue'].join(','));
    topProducts.forEach((p) => {
      rows.push(
        [
          csvCell(p.name),
          csvCell(p.quantity),
          csvCell((p.revenue / 100).toFixed(2)),
        ].join(',')
      );
    });

    // ✅ BOM para Excel (tildes/ñ)
    const csv = '\uFEFF' + rows.join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="resumen-${period}-${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json(
      { success: false, error: 'Error al exportar datos' },
      { status: 500 }
    );
  }
}