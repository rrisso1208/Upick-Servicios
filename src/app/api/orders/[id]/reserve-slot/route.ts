/**
 * POST /api/orders/:id/reserve-slot
 * ----------------------------------------------------
 * OBJETIVO:
 * - Reservar (temporalmente) un cupo de recogida (pickup slot) para una orden específica.
 * - Esto se hace ANTES de pagar, para evitar que 20 personas paguen al mismo tiempo por el mismo cupo.
 *
 * FLUJO GENERAL:
 * 1) Autentica al usuario (debe ser student)
 * 2) Busca la orden por id y valida que sea del usuario
 * 3) Valida que la orden esté en estado awaiting_payment
 * 4) Valida body (slotStart)
 * 5) Calcula slotEnd usando pickupSlotMinutes del restaurante
 * 6) Llama reserveSlot(...) que incrementa SlotCapacity.reserved si hay disponibilidad
 * 7) Si se reservó, actualiza la orden con pickupSlotStart/pickupSlotEnd
 * 8) Devuelve success
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { reserveSlotSchema } from '@/lib/validations/order';
import { getAuthUser } from '@/lib/auth';
import { reserveSlot } from '@/lib/slots';
import logger from '../../../../../lib/logger';
import { addMinutes } from 'date-fns';

// Para que Next.js no intente “pre-renderizar” esto (es API dinámica)
export const dynamic = 'force-dynamic';

function parseHHMMToMinutes(hhmm: string): number | null {
  const parts = hhmm.split(':');
  if (parts.length !== 2) return null;
  const [h, m] = parts.map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function getColombiaMinutesFromSlotStart(slotStart: Date): number {
  const COLOMBIA_OFFSET_HOURS = 5;
  const utcH = slotStart.getUTCHours();
  const utcM = slotStart.getUTCMinutes();
  const colombiaH = (utcH - COLOMBIA_OFFSET_HOURS + 24) % 24;
  return colombiaH * 60 + utcM;
}


export async function POST(
  req: NextRequest,
  // Next App Router: params viene como Promise (por cómo lo tiparon en este proyecto)
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1) Sacamos el id de la URL: /api/orders/:id/reserve-slot
    const { id } = await params;

    // 2) Autenticación del usuario actual (usa cookies + supabase server client)
    //    Nota: aquí NO están usando Authorization Bearer, solo cookie-auth.
    const user = await getAuthUser();

    // Solo los estudiantes pueden reservar slots para sus órdenes
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3) Buscamos la orden en BD + el restaurante (porque necesitamos pickupSlotMinutes)
    const order = await prisma.order.findUnique({
      where: { id: id },
      include: {
        restaurant: true,
        items: {
          select: {
            product: {
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
            },
          },
        },
      },
    });

    // Validación:
    // - Debe existir la orden
    // - Y debe pertenecerle al estudiante logueado (order.studentId === user.id)
    if (!order || order.studentId !== user.id) {
      return NextResponse.json(
        { error: 'Order not found or unauthorized' },
        { status: 404 }
      );
    }

    // 4) Este endpoint solo permite reservar si la orden aún no se ha pagado.
    //    Si ya está pagada o cancelada, no tiene sentido reservar.
    if (order.status !== 'awaiting_payment') {
      return NextResponse.json(
        { error: 'Order is not awaiting payment' },
        { status: 400 }
      );
    }

    // 5) Leemos el body del request. Se espera algo como:
    //    { "slotStart": "2026-01-20T15:00:00.000Z" } (ejemplo)
    const body = await req.json();

    // Validamos estructura/tipo del body con Zod (reserveSlotSchema).
    // Si falta slotStart o viene mal, parse() lanza error y cae al catch.
    const { slotStart } = reserveSlotSchema.parse(body);

    // Convertimos el string a Date
    const slotStartDate = new Date(slotStart);

    // 6) Calculamos el final del slot con la configuración del restaurante.
    //    Ej: si pickupSlotMinutes = 10, el slot es [15:00, 15:10]
    const slotEndDate = addMinutes(
      slotStartDate,
      order.restaurant.pickupSlotMinutes
    );

    // ✅ Validar horario de recogida por categorías del carrito (intersección)
    const categories = order.items
      .map((it) => it.product?.category)
      .filter(Boolean);

    let restrictedBySaleHours = false;
    let allowedStartMinutes = 0;
    let allowedEndMinutes = 24 * 60;

    for (const cat of categories) {
      const start = cat.saleHoursStart ? parseHHMMToMinutes(cat.saleHoursStart) : null;
      const end = cat.saleHoursEnd ? parseHHMMToMinutes(cat.saleHoursEnd) : null;

      if (start !== null || end !== null) {
        restrictedBySaleHours = true;
        if (start !== null) allowedStartMinutes = Math.max(allowedStartMinutes, start);
        if (end !== null) allowedEndMinutes = Math.min(allowedEndMinutes, end);
      }
    }

    if (restrictedBySaleHours && allowedStartMinutes >= allowedEndMinutes) {
      return NextResponse.json(
        {
          error:
            'Tu carrito tiene productos con horarios de recogida incompatibles. Ajusta tu carrito para poder elegir una hora.',
        },
        { status: 400 }
      );
    }

    if (restrictedBySaleHours) {
      const pickupMinutes = getColombiaMinutesFromSlotStart(slotStartDate);
      if (pickupMinutes < allowedStartMinutes || pickupMinutes >= allowedEndMinutes) {
        return NextResponse.json(
          {
            error:
              'La hora seleccionada no es válida para los productos de tu carrito. Elige una hora dentro del horario permitido.',
          },
          { status: 400 }
        );
      }
    }

    // 7) Intentamos reservar el slot (lógica anti-filas).
    //    reserveSlot(...) por dentro:
    //    - usa transacción
    //    - mira capacity - reserved - confirmedOrdersCount
    //    - si hay cupo incrementa reserved y retorna true
    const reserved = await reserveSlot(
      order.restaurantId,
      slotStartDate,
      slotEndDate
    );

    // Si no se pudo reservar, es porque el cupo ya se llenó
    if (!reserved) {
      return NextResponse.json(
        { error: 'Slot not available' },
        { status: 400 }
      );
    }

    // 8) Guardamos en la orden qué slot quedó reservado.
    //    Importante: esto “amarra” la orden a ese slot para cuando pague,
    //    luego payment-status pueda confirmar (reserved -> confirmed)
    await prisma.order.update({
      where: { id: id },
      data: {
        pickupSlotStart: slotStartDate,
        pickupSlotEnd: slotEndDate,
      },
    });

    logger.info(
      { orderId: id, slotStart: slotStartDate },
      'Slot reserved for order'
    );

    // 9) Respondemos al frontend con los datos del slot reservado.
    return NextResponse.json({
      success: true,
      data: {
        slotStart: slotStartDate,
        slotEnd: slotEndDate,
      },
    });
  } catch (error) {
    // Si es un error conocido (por ejemplo Zod parse error),
    // devuelve 400 con el mensaje.
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Si es un error raro/no tipado
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

