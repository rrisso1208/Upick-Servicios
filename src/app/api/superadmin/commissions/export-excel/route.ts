/**
 * GET /api/superadmin/commissions/export-excel - Export commission data to Excel
 * Creates an Excel file with one sheet per restaurant
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/db';
import * as XLSX from 'xlsx';
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
    restaurantId = searchParams.get('restaurantId'); // For single restaurant export

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

    // Get all restaurants
    const restaurants = await prisma.restaurant.findMany({
      where: restaurantId ? { id: restaurantId } : {},
      select: {
        id: true,
        name: true,
        commissionPercentage: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Process each restaurant
    for (const restaurant of restaurants) {
      // Get orders for this restaurant
      const orders = await prisma.order.findMany({
        where: {
          ...orderWhere,
          restaurantId: restaurant.id,
        },
        include: {
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

      // Calculate totals
      let totalVentas = 0;
      let totalComision = 0;
      const totalPedidos = orders.length;

      // Prepare data for the sheet
      const sheetData: any[] = [];

      // Add header row
      sheetData.push([
        'Fecha',
        'ID Pedido',
        'Código Recogida',
        'Lugar',
        'Monto Total (COP)',
        'Comisión %',
        'Comisión Monto (COP)',
        'Neto Restaurante (COP)',
      ]);

      // Add order rows
      orders.forEach((order) => {
        const fecha = new Date(order.createdAt).toLocaleDateString('es-CO', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        const montoTotal = order.totalAmount / 100;

        // Calculate commission if not stored
        let comisionMonto = 0;
        if (
          order.platformCommissionAmount !== null &&
          order.platformCommissionAmount > 0
        ) {
          comisionMonto = order.platformCommissionAmount / 100;
        } else {
          const commissionPercentage = Number(
            restaurant.commissionPercentage || 0
          );
          const commissionRate =
            commissionPercentage && commissionPercentage > 0
              ? commissionPercentage / 100
              : 0.05; // Default 5%
          comisionMonto = (order.totalAmount * commissionRate) / 100;
        }

        const comisionPorcentaje = Number(
          restaurant.commissionPercentage || 5.0
        );
        const netoRestaurante = montoTotal - comisionMonto;

        totalVentas += montoTotal;
        totalComision += comisionMonto;

        sheetData.push([
          fecha,
          order.id,
          order.pickupCode,
          order.place.name,
          montoTotal.toFixed(2),
          comisionPorcentaje.toFixed(2),
          comisionMonto.toFixed(2),
          netoRestaurante.toFixed(2),
        ]);
      });

      // Add summary rows
      sheetData.push([]); // Empty row
      sheetData.push(['RESUMEN', '', '', '', '', '', '', '']);
      sheetData.push(['Total Pedidos:', totalPedidos, '', '', '', '', '', '']);
      sheetData.push([
        'Total Ventas:',
        '',
        '',
        '',
        totalVentas.toFixed(2),
        '',
        '',
        '',
      ]);
      sheetData.push([
        'Total Comisión:',
        '',
        '',
        '',
        '',
        '',
        totalComision.toFixed(2),
        '',
      ]);
      sheetData.push([
        'Neto a Pagar al Restaurante:',
        '',
        '',
        '',
        '',
        '',
        '',
        (totalVentas - totalComision).toFixed(2),
      ]);

      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

      // Set column widths
      worksheet['!cols'] = [
        { wch: 12 }, // Fecha
        { wch: 30 }, // ID Pedido
        { wch: 15 }, // Código Recogida
        { wch: 20 }, // Lugar
        { wch: 18 }, // Monto Total
        { wch: 12 }, // Comisión %
        { wch: 18 }, // Comisión Monto
        { wch: 22 }, // Neto Restaurante
      ];

      // Add worksheet to workbook with restaurant name as sheet name
      // Excel sheet names are limited to 31 characters
      const sheetName = restaurant.name.substring(0, 31);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    // Generate filename
    const dateStr =
      dateFrom && dateTo
        ? `${dateFrom}_${dateTo}`
        : dateFrom
          ? `${dateFrom}_hoy`
          : 'todo';
    const filename = restaurantId
      ? `comisiones-restaurante-${dateStr}-${new Date().toISOString().split('T')[0]}.xlsx`
      : `comisiones-todos-restaurantes-${dateStr}-${new Date().toISOString().split('T')[0]}.xlsx`;

    // Return Excel file
    return new Response(excelBuffer, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error(
      { error, dateFrom, dateTo, restaurantId },
      'Error exporting commissions to Excel'
    );
    return NextResponse.json(
      { success: false, error: 'Error al exportar comisiones a Excel' },
      { status: 500 }
    );
  }
}
