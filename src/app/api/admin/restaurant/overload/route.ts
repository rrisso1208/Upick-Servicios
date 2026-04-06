/**
 * /api/admin/restaurant/overload
 *
 * GET  -> devuelve estado actual de overload del restaurante del admin (privado)
 * POST -> permite activar/desactivar overload por X minutos (privado)
 *
 * Seguridad:
 * - Usa getAdminRestaurant(req) para determinar si el usuario es admin
 *   y a qué restaurantId tiene acceso.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAdminRestaurant } from '@/lib/admin-helpers';

// Evita cache / fuerza ejecución en runtime
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // ✅ Identifica el restaurante del admin autenticado
    const restaurantId = await getAdminRestaurant(req);

    // Si no hay restaurante, no está autorizado o no está asociado
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Consulta estado actual (solo campos necesarios)
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        isOverloaded: true,
        overloadUntil: true,
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: 'Restaurante no encontrado' },
        { status: 404 }
      );
    }

    /**
     * ✅ Auto-apagado:
     * Si estaba overloaded pero ya venció la hora, se actualiza en BD
     * para dejarlo en estado normal.
     */
    if (restaurant.isOverloaded && restaurant.overloadUntil) {
      if (new Date() >= restaurant.overloadUntil) {
        await prisma.restaurant.update({
          where: { id: restaurantId },
          data: {
            isOverloaded: false,
            overloadUntil: null,
          },
        });

        // Devuelve el estado corregido
        return NextResponse.json({
          success: true,
          data: {
            isOverloaded: false,
            overloadUntil: null,
          },
        });
      }
    }

    // Devuelve el estado actual tal cual
    return NextResponse.json({
      success: true,
      data: {
        isOverloaded: restaurant.isOverloaded,
        overloadUntil: restaurant.overloadUntil,
      },
    });
  } catch (error) {
    console.error('Error fetching overload status:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener estado de sobrecarga' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // ✅ Identifica restaurante del admin autenticado
    const restaurantId = await getAdminRestaurant(req);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Lee body: isOverloaded boolean y minutes number
    const body = await req.json();
    const { isOverloaded, minutes } = body;

    // Por defecto, si se apaga overload => overloadUntil null
    let overloadUntil: Date | null = null;

    /**
     * Si se quiere ACTIVAR overload, minutes es obligatorio (>0).
     * Calcula overloadUntil como "ahora + minutes".
     */
    if (isOverloaded === true) {
      if (!minutes || minutes <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Debes especificar los minutos de sobrecarga',
          },
          { status: 400 }
        );
      }

      overloadUntil = new Date();
      overloadUntil.setMinutes(
        overloadUntil.getMinutes() + parseInt(String(minutes))
      );
    }

    /**
     * ✅ Guarda en BD:
     * - isOverloaded true/false
     * - overloadUntil fecha o null
     */
    const restaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        isOverloaded: isOverloaded === true,
        overloadUntil,
      },
      select: {
        isOverloaded: true,
        overloadUntil: true,
      },
    });

    // Respuesta con mensaje amigable
    return NextResponse.json({
      success: true,
      data: restaurant,
      message: isOverloaded
        ? `Sobrecarga activada por ${minutes} minutos`
        : 'Sobrecarga desactivada',
    });
  } catch (error) {
    console.error('Error updating overload status:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar estado de sobrecarga' },
      { status: 500 }
    );
  }
}
