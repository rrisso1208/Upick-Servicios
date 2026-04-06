/**
 * GET /api/restaurants/[slug]/overload
 * Endpoint público:
 * - Devuelve si el restaurante está sobrecargado (isOverloaded)
 * - Devuelve hasta cuándo (overloadUntil)
 *
 * Comportamiento extra:
 * - Si el restaurante estaba overloaded pero la fecha ya pasó,
 *   automáticamente lo “desactiva” en BD (isOverloaded=false, overloadUntil=null)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Fuerza que sea dinámico (no cacheado por Next)
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // ✅ Obtiene el slug desde la ruta /api/restaurants/{slug}/overload
    const { slug } = await params;

    /**
     * Busca el restaurante por slug.
     * Solo trae lo necesario: id, flag de overload y fecha.
     */
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      select: {
        id: true,
        isOverloaded: true,
        overloadUntil: true,
      },
    });

    // Si no existe el restaurante, 404
    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    /**
     * ✅ Auto-limpieza de overload:
     * Si isOverloaded=true y overloadUntil existe, y YA se venció,
     * entonces actualiza la BD para “apagar” el overload.
     */
    if (restaurant.isOverloaded && restaurant.overloadUntil) {
      if (new Date() >= restaurant.overloadUntil) {
        // Actualiza estado en la base de datos
        await prisma.restaurant.update({
          where: { id: restaurant.id },
          data: {
            isOverloaded: false,
            overloadUntil: null,
          },
        });

        // Responde como NO overloaded (ya corregido)
        return NextResponse.json({
          success: true,
          data: {
            isOverloaded: false,
            overloadUntil: null,
          },
        });
      }
    }

    /**
     * Caso normal:
     * - Devuelve el estado actual tal cual esté en BD
     */
    return NextResponse.json({
      success: true,
      data: {
        isOverloaded: restaurant.isOverloaded,
        overloadUntil: restaurant.overloadUntil,
      },
    });
  } catch (error) {
    // Log para Vercel / servidor
    console.error('Error fetching overload status:', error);

    // Error genérico
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

