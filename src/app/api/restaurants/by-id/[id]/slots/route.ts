/**
 * GET /api/restaurants/by-id/:id/slots
 * Get available pickup slots by restaurant ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAvailableSlots } from '@/lib/slots';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

function parseHHMMToMinutes(hhmm: string): number | null {
  const parts = hhmm.split(':');
  if (parts.length !== 2) return null;
  const [h, m] = parts.map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/**
 * slotStart en este proyecto viene como "UTC representando Colombia":
 * - Colombia (UTC-5) => se guarda con +5 horas en UTC
 * Para obtener la hora Colombia del slot, se resta 5h a la hora UTC del Date.
 */
function getColombiaMinutesFromSlotStart(slotStart: Date): number {
  const COLOMBIA_OFFSET_HOURS = 5; // slotStartUTC = colombia + 5
  const utcH = slotStart.getUTCHours();
  const utcM = slotStart.getUTCMinutes();
  const colombiaH = (utcH - COLOMBIA_OFFSET_HOURS + 24) % 24;
  return colombiaH * 60 + utcM;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '3', 10);

    // productIds viene del checkout para poder filtrar slots por horarios de categorías del carrito
    const productIdsParam = searchParams.get('productIds') || '';
    const productIds = productIdsParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const slots = await getAvailableSlots(id, days);

    // --- Calcular restricción de recogida por carrito (intersección de categorías) ---
    let restrictedBySaleHours = false;
    let allowedStartMinutes = 0; // 00:00
    let allowedEndMinutes = 24 * 60; // 24:00
    let noIntersection = false;

    if (productIds.length > 0) {
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          category: {
            select: {
              id: true,
              name: true,
              saleHoursStart: true,
              saleHoursEnd: true,
            },
          },
        },
      });

      const categories = products
        .map((p) => p.category)
        .filter(Boolean);

      // Si algún producto no existe o viene sin categoría, igual no rompemos:
      // simplemente no aporta restricción.
      for (const cat of categories) {
        const start = cat.saleHoursStart
          ? parseHHMMToMinutes(cat.saleHoursStart)
          : null;
        const end = cat.saleHoursEnd
          ? parseHHMMToMinutes(cat.saleHoursEnd)
          : null;

        if (start !== null || end !== null) {
          restrictedBySaleHours = true;
          if (start !== null) allowedStartMinutes = Math.max(allowedStartMinutes, start);
          if (end !== null) allowedEndMinutes = Math.min(allowedEndMinutes, end);
        }
      }

      if (restrictedBySaleHours && allowedStartMinutes >= allowedEndMinutes) {
        noIntersection = true;
      }
    }

    const filteredSlots =
      noIntersection || !restrictedBySaleHours
        ? (noIntersection ? [] : slots)
        : slots.filter((s) => {
          const m = getColombiaMinutesFromSlotStart(
            s.slotStart instanceof Date ? s.slotStart : new Date(s.slotStart)
          );
          return m >= allowedStartMinutes && m < allowedEndMinutes;
        });

    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      select: {
        allowEatIn: true,
        allowTakeout: true,
        allowInternalDelivery: true,
        deliveryFee: true,
        freeFeeThreshold: true,
        lowOrderFee: true,
        takeoutFee: true,
        type: true,
        tables: {
          where: { isActive: true },
          select: { id: true, name: true }
        }
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        slots: filteredSlots,
        restrictions: {
          restrictedBySaleHours,
          noIntersection,
          allowedWindow:
            restrictedBySaleHours
              ? {
                startMinutes: allowedStartMinutes,
                endMinutes: allowedEndMinutes,
              }
              : null,
        },
        restaurant: {
          allowEatIn: restaurant?.allowEatIn ?? true,
          allowTakeout: restaurant?.allowTakeout ?? true,
          allowInternalDelivery: restaurant?.allowInternalDelivery ?? false,
          deliveryFee: restaurant?.deliveryFee ?? 0,
          freeFeeThreshold: restaurant?.freeFeeThreshold ?? 0,
          lowOrderFee: restaurant?.lowOrderFee ?? 0,
          takeoutFee: restaurant?.takeoutFee ?? 0,
          type: restaurant?.type || 'RESTAURANT',
          tables: restaurant?.tables || [],
        },
      },
    });
  } catch (error) {
    console.error('Error fetching slots:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
