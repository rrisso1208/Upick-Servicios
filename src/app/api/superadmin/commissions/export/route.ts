/**
 * GET /api/superadmin/commissions/export - Export commission data to CSV
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/db';
import logger from '../../../../../lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  let dateFrom: string | null = null;
  let dateTo: string | null = null;
  let restaurantId: string | null = null;
  try {
    // Try to get user from Authorization header first
    const authHeader = req.headers.get('authorization');
    let user = null;

    if (authHeader) {
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
    dateFrom = searchParams.get('dateFrom');
    dateTo = searchParams.get('dateTo');
    restaurantId = searchParams.get('restaurantId');

    // Build date filter
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

    // Build order where clause
    const orderWhere: any = {
      status: {
        in: ['paid', 'in_progress', 'ready', 'delivered'],
      },
    };

    if (Object.keys(dateFilter).length > 0) {
      orderWhere.createdAt = dateFilter;
    }

    if (restaurantId) {
      orderWhere.restaurantId = restaurantId;
    }

    // Get all orders with commission data
    const orders = await prisma.order.findMany({
      where: orderWhere,
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            commissionPercentage: true,
          },
        },
        place: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Generate CSV
    const csvRows = [];

    // Header
    csvRows.push(
      [
        'Fecha',
        'ID Pedido',
        'Restaurante',
        'Lugar',
        'Monto Total',
        'Comisión %',
        'Comisión Monto',
        'Neto Restaurante',
      ].join(',')
    );

    // Data rows
    orders.forEach((order) => {
      const fecha = new Date(order.createdAt).toLocaleDateString('es-CO');
      const montoTotal = (order.totalAmount / 100).toFixed(2);

      // Calculate commission if not stored
      let comisionMonto = 0;
      if (
        order.platformCommissionAmount !== null &&
        order.platformCommissionAmount > 0
      ) {
        comisionMonto = order.platformCommissionAmount;
      } else {
        const commissionPercentage = Number(
          order.restaurant.commissionPercentage || 0
        );
        const commissionRate =
          commissionPercentage && commissionPercentage > 0
            ? commissionPercentage / 100
            : 0.05; // Default 5%
        comisionMonto = Math.round(order.totalAmount * commissionRate);
      }

      const comisionPorcentaje = Number(
        order.restaurant.commissionPercentage || 5.0
      );
      const netoRestaurante = order.totalAmount - comisionMonto;

      // Escape CSV values
      const escapeCSV = (value: any) => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      csvRows.push(
        [
          fecha,
          order.id,
          escapeCSV(order.restaurant.name),
          escapeCSV(order.place.name),
          montoTotal,
          comisionPorcentaje.toString(),
          (comisionMonto / 100).toFixed(2),
          (netoRestaurante / 100).toFixed(2),
        ].join(',')
      );
    });

    const csv = csvRows.join('\n');

    // Generate filename
    const filename = `comisiones-${dateFrom || 'todo'}-${dateTo || 'hoy'}-${new Date().toISOString().split('T')[0]}.csv`;

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error(
      { error, dateFrom, dateTo, restaurantId },
      'Error exporting commissions'
    );
    return NextResponse.json(
      { success: false, error: 'Error al exportar comisiones' },
      { status: 500 }
    );
  }
}
