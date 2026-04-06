import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getAuthUser, getAuthUserFromHeader} from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
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

    const students = await prisma.user.findMany({
      where: {
        role: 'student',
      },
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Header CSV
    const headers = ['Nombre', 'Apellido', 'Correo', 'Celular', 'Pedidos'];

    // Filas
    const rows = students.map((student) => [
      student.firstName ?? '',
      student.lastName ?? '',
      student.email,
      student.phoneNumber ?? '',
      student._count.orders,
    ]);

    // Construir CSV
    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((row) =>
          row
            .map((field) =>
              `"${String(field).replace(/"/g, '""')}"`
            )
            .join(',')
        )
        .join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition':
          'attachment; filename=students_upick.csv',
      },
    });
  } catch (error) {
    console.error('CSV export error:', error);

    return NextResponse.json(
      { success: false, error: 'Error al exportar' },
      { status: 500 }
    );
  }
}