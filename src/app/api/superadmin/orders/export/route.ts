/**
 * GET /api/superadmin/orders/export - Export orders to CSV
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();

    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');
    const restaurantId = searchParams.get('restaurantId');
    const placeId = searchParams.get('placeId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search');
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');

    const statusList = statusFilter ? statusFilter.split(',') : undefined;

    // Build where clause (same as GET endpoint)
    const where: any = {
      status: {
        notIn: ['awaiting_payment', 'payment_failed'],
      },
    };

    if (statusList) {
      where.status = { in: statusList };
    }

    if (restaurantId) {
      where.restaurantId = restaurantId;
    }

    if (placeId) {
      where.placeId = placeId;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        where.createdAt.gte = fromDate;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    if (minAmount || maxAmount) {
      where.totalAmount = {};
      if (minAmount) {
        where.totalAmount.gte = parseInt(minAmount);
      }
      if (maxAmount) {
        where.totalAmount.lte = parseInt(maxAmount);
      }
    }

    if (search) {
      where.OR = [
        { pickupCode: { contains: search, mode: 'insensitive' } },
        {
          student: {
            email: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    // Get all orders (no pagination for export)
    const orders = await prisma.order.findMany({
      where,
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        restaurant: {
          select: {
            name: true,
          },
        },
        place: {
          select: {
            name: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
        payment: {
          select: {
            method: true,
            status: true,
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
        'ID Pedido',
        'Código Recogida',
        'Fecha',
        'Hora',
        'Cliente',
        'Email',
        'Restaurante',
        'Lugar',
        'Estado',
        'Monto Total',
        'Comisión',
        'Método de Pago',
        'Estado Pago',
        'Productos',
        'Hora Recogida',
      ].join(',')
    );

    // Data rows
    orders.forEach((order) => {
      const date = new Date(order.createdAt);
      const fecha = date.toLocaleDateString('es-CO');
      const hora = date.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const cliente =
        `${order.student.firstName || ''} ${order.student.lastName || ''}`.trim() ||
        order.student.email;

      const productos = order.items
        .map((item) => `${item.quantity}x ${item.product.name}`)
        .join('; ');

      const horaRecogida = order.pickupSlotStart
        ? new Date(order.pickupSlotStart).toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'N/A';

      const metodoPago = order.payment?.method || 'N/A';
      const estadoPago = order.payment?.status || 'N/A';
      const comision = order.platformCommissionAmount
        ? (order.platformCommissionAmount / 100).toFixed(2)
        : '0.00';

      // Escape commas and quotes in CSV
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
          order.id,
          order.pickupCode,
          fecha,
          hora,
          escapeCSV(cliente),
          order.student.email,
          escapeCSV(order.restaurant.name),
          escapeCSV(order.place.name),
          order.status,
          (order.totalAmount / 100).toFixed(2),
          comision,
          metodoPago,
          estadoPago,
          escapeCSV(productos),
          horaRecogida,
        ].join(',')
      );
    });

    const csv = csvRows.join('\n');

    // Generate filename with date range
    const filename = `pedidos-${dateFrom || 'todo'}-${dateTo || 'hoy'}-${new Date().toISOString().split('T')[0]}.csv`;

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting orders:', error);
    return NextResponse.json(
      { success: false, error: 'Error al exportar pedidos' },
      { status: 500 }
    );
  }
}
