/**
 * GET /api/student/credits
 * Get user credit balance and transactions
 *
 * ✅ Qué devuelve:
 * - balance (en centavos)
 * - últimas 50 transacciones de crédito
 *
 * 🔗 Quién lo usa:
 * - UserMenu (para mostrar saldo)
 * - (posiblemente) página /credits
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Funciones de auth internas del proyecto.
 * - getAuthUserFromHeader: intenta autenticar usando "Authorization: Bearer <token>"
 * - getAuthUser: intenta autenticar usando cookies/sesión (ej: supabase cookie)
 *
 * 👉 Aquí está la magia de "quién es el usuario realmente"
 */
import { getAuthUser, getAuthUserFromHeader } from '@/lib/auth';

import { prisma } from '@/lib/db';
import logger from '../../../../lib/logger';

export const dynamic = 'force-dynamic'; // API sin cache

export async function GET(req: NextRequest) {
  try {
    /**
     * 1) AUTENTICACIÓN
     *
     * Este endpoint intenta autenticar de 2 formas:
     * A) con Authorization header (Bearer token)
     * B) si eso falla, con sesión/cookies (getAuthUser)
     *
     * Esto es útil porque:
     * - UserMenu envía Bearer token si lo tiene
     * - Pero también permite funcionar si solo hay cookies
     */

      // Intenta leer Authorization header con ambas capitalizaciones
    const authHeader =
        req.headers.get('authorization') || req.headers.get('Authorization');

    let user;

    /**
     * A) Si viene Bearer token, lo usamos primero
     */
    if (authHeader && authHeader.startsWith('Bearer ')) {
      user = await getAuthUserFromHeader(authHeader);
    }

    /**
     * B) Si no se pudo obtener usuario por header,
     * intentamos obtenerlo por sesión/cookies.
     */
    if (!user) {
      user = await getAuthUser();
    }

    /**
     * 2) AUTORIZACIÓN (Permisos)
     *
     * Solo estudiantes pueden consultar créditos.
     */
    if (!user || user.role !== 'student') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    /**
     * 3) Traer el registro de créditos del usuario
     *
     * Tabla: UserCredit
     * - userId es único
     * - balance está en centavos
     */
    let userCredit = await prisma.userCredit.findUnique({
      where: { userId: user.id },
    });

    /**
     * Si el usuario nunca tuvo créditos,
     * se crea el registro con balance 0.
     *
     * Esto evita errores en UI: siempre habrá un balance.
     */
    if (!userCredit) {
      userCredit = await prisma.userCredit.create({
        data: {
          userId: user.id,
          balance: 0,
        },
      });
    }

    /**
     * 4) Traer transacciones recientes
     *
     * Tabla: CreditTransaction
     * - últimas 50
     * - ordenadas por fecha desc
     *
     * include(order):
     * - si la transacción está asociada a un pedido,
     *   traemos info mínima del pedido y restaurante
     */
    const transactions = await prisma.creditTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        order: {
          select: {
            id: true,
            pickupCode: true,
            restaurant: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    /**
     * 5) Respuesta final
     *
     * Nota:
     * Aquí se hace un "map" para devolver solo lo que el frontend necesita,
     * y además normalizar la forma del objeto.
     */
    return NextResponse.json({
      success: true,
      data: {
        balance: userCredit.balance, // centavos
        transactions: transactions.map((t) => ({
          id: t.id,
          amount: t.amount,
          type: t.type,
          description: t.description,
          createdAt: t.createdAt,

          // Si hay order, devolvemos info reducida
          order: t.order
            ? {
              id: t.order.id,
              pickupCode: t.order.pickupCode,
              restaurantName: t.order.restaurant.name,
            }
            : null,
        })),
      },
    });
  } catch (error) {
    /**
     * 6) Manejo de error
     *
     * - Loggea (con logger del proyecto)
     * - Devuelve 500
     */
    logger.error({ error }, 'Error fetching user credits');

    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener créditos',
      },
      { status: 500 }
    );
  }
}
