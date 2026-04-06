import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { prisma } from '../../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader} from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    // 🔐 Autenticación EXACTAMENTE como tus otros endpoints
    const authHeader =
      req.headers.get('authorization') ||
      req.headers.get('Authorization');

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

    // 🔽 Tu lógica normal
    const students = await prisma.user.findMany({
      where: { role: 'student' },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        _count: {
          select: {
            orders: {
              where: {
                status: {
                  in: ['paid', 'in_progress', 'ready', 'delivered'],
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Students');

    worksheet.addTable({
      name: 'UsersTable',
      ref: 'A1',
      headerRow: true,
      style: {
        theme: 'TableStyleMedium9',
        showRowStripes: true,
      },
      columns: [
        { name: 'Nombre' },
        { name: 'Apellido' },
        { name: 'Correo' },
        { name: 'Celular' },
        { name: 'Pedidos' },
      ],
      rows: students.map((student) => [
        student.firstName ?? '',
        student.lastName ?? '',
        student.email,
        student.phoneNumber ?? '',
        student._count.orders,
      ]),
    });

// 🔥 estilos header
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' },
      };
    });

// 🔥 freeze header
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

// 🔥 widths
    worksheet.getColumn(1).width = 20;
    worksheet.getColumn(2).width = 20;
    worksheet.getColumn(3).width = 35;
    worksheet.getColumn(4).width = 20;
    worksheet.getColumn(5).width = 15;

    const buffer = await workbook.xlsx.writeBuffer();
    const uint8Array = new Uint8Array(buffer);

    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition':
          'attachment; filename=students_upick.xlsx',
      },
    });
  } catch (error) {
    console.error('Export error:', error);

    return NextResponse.json(
      { success: false, error: 'Error al exportar' },
      { status: 500 }
    );
  }
}