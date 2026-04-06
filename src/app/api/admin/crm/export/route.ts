/**
 * GET /api/admin/crm/export - Export CRM data as CSV or Excel
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAuthUserFromHeader } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/db';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    let user;

    // Try to get from Authorization header first
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      user = await getAuthUserFromHeader(authHeader);
    }

    // Fallback to cookie-based auth
    if (!user) {
      user = await getAuthUser();
    }

    if (!user || user.role !== 'restaurant_admin' || !user.restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'csv'; // csv or excel
    const search = searchParams.get('search') || '';

    // Get all orders for this restaurant
    // IMPORTANT: Exclude cancelled and refunded orders from export
    const where: any = {
      restaurantId: user.restaurantId,
      status: {
        notIn: ['awaiting_payment', 'cancelled', 'refunded'],
      },
    };

    if (search) {
      where.OR = [
        { student: { email: { contains: search, mode: 'insensitive' } } },
        { student: { firstName: { contains: search, mode: 'insensitive' } } },
        { student: { lastName: { contains: search, mode: 'insensitive' } } },
        {
          invoiceData: {
            businessName: { contains: search, mode: 'insensitive' },
          },
        },
        {
          invoiceData: {
            documentNumber: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            invoiceData: true,
          },
        },
        invoiceData: true,
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
            status: true,
            amount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Prepare data for export
    const exportData = orders.map((order) => {
      const customerName =
        order.student.firstName || order.student.lastName
          ? `${order.student.firstName || ''} ${order.student.lastName || ''}`.trim()
          : 'N/A';

      const invoice = order.invoiceData || (order.student as any).invoiceData;

      return {
        'Fecha Pedido': order.createdAt.toLocaleDateString('es-CO'),
        'Hora Pedido': order.createdAt.toLocaleTimeString('es-CO'),
        'ID Pedido': order.id,
        'Código Recogida': order.pickupCode,
        Estado: order.status,
        'Email Cliente': order.student.email,
        'Nombre Cliente': customerName,
        'Teléfono Cliente': order.student.phoneNumber || 'N/A',
        'Necesita Factura': order.needsInvoice ? 'Sí' : 'No',
        'Tipo Persona':
          invoice?.personType === 'natural'
            ? 'Natural'
            :  invoice?.personType === 'juridica'
              ? 'Jurídica'
              : 'N/A',
        'Tipo Documento': invoice?.documentType || 'N/A',
        'Número Documento': invoice?.documentNumber || 'N/A',
        'Razón Social/Nombre': invoice?.businessName || 'N/A',
        Dirección: invoice?.address || 'N/A',
        Ciudad: invoice?.city || 'N/A',
        Departamento: invoice?.department || 'N/A',
        'Teléfono Facturación': invoice?.phone || 'N/A',
        'Email Facturación': invoice?.email || 'N/A',
        'Régimen Tributario': invoice?.regime || 'N/A',
        'Total Pedido': (order.totalAmount / 100).toFixed(2),
        'Estado Pago': order.payment?.status || 'N/A',
        'Monto Pago': order.payment?.amount
          ? (order.payment.amount / 100).toFixed(2)
          : 'N/A',
        Productos: order.items
          .map((item) => `${item.product.name} x${item.quantity}`)
          .join(', '),
      };
    });

    if (format === 'excel') {
      // Create Excel file
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'CRM Data');

      // Generate buffer
      const excelBuffer = XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
      });

      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="crm-${new Date().toISOString().split('T')[0]}.xlsx"`,
        },
      });
    } else {
      // Create CSV
      if (exportData.length === 0) {
        return new NextResponse('No hay datos para exportar', {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="crm-${new Date().toISOString().split('T')[0]}.csv"`,
          },
        });
      }

      const headers = Object.keys(exportData[0]);
      const csvRows = [
        headers.join(','),
        ...exportData.map((row) =>
          headers
            .map((header) => {
              const value = row[header as keyof typeof row];
              // Escape commas and quotes in CSV
              if (
                typeof value === 'string' &&
                (value.includes(',') || value.includes('"'))
              ) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            })
            .join(',')
        ),
      ];

      const csvContent = csvRows.join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="crm-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }
  } catch (error) {
    console.error('Error exporting CRM data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al exportar datos del CRM',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
