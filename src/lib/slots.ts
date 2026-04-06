/**
 * Slot Capacity Management (Anti-Queue System)
 *
 * ✅ Objetivo del módulo:
 * - Generar franjas (slots) disponibles para recoger pedidos.
 * - Reservar un cupo cuando el usuario está pagando (reserved).
 * - Confirmar el cupo cuando el pago se aprueba (confirmed).
 * - Liberar el cupo si el pago falla o el usuario abandona.
 *
 * En BD (tabla SlotCapacity) se maneja por restaurante + slotStart:
 * - capacity: capacidad total del slot
 * - reserved: “apartados” temporalmente (checkout)
 * - confirmed: confirmados (pagados)
 *
 * Nota: aquí decidieron que confirmed REAL se calcula contando órdenes,
 * no usando slot.confirmed (porque puede estar desactualizado).
 */

import { addMinutes, isBefore } from 'date-fns';
import { prisma } from './db';
import logger from './logger';

export interface AvailableSlot {
  slotStart: Date;   // inicio del slot (Date)
  slotEnd: Date;     // fin del slot (Date)
  available: number; // cupos disponibles
  capacity: number;  // capacidad total del slot
}

// const RESERVATION_TTL_MINUTES = 8; // Time to complete payment (unused for now)

/**
 * ✅ getAvailableSlots
 *
 * Genera slots disponibles para un restaurante para los próximos N días.
 *
 * Recibe:
 * - restaurantId: el restaurante
 * - daysAhead: cuántos días hacia adelante (default 3)
 *
 * Devuelve:
 * - Array de slots con disponibilidad (> 0)
 *
 * Importante:
 * - Consulta BD para configuración del restaurante: duración y capacidad y openHours.
 * - Por cada slot, consulta:
 *    1) cuántas órdenes confirmadas hay en ese slot (order.count)
 *    2) si existe un registro SlotCapacity para reserved/capacity
 * - Luego calcula available = capacity - reserved - confirmed
 */
export async function getAvailableSlots(
  restaurantId: string,
  daysAhead: number = 3
): Promise<AvailableSlot[]> {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        pickupSlotMinutes: true,
        capacityPerSlotDefault: true,
        openHours: true,
      },
    });

    if (
      !restaurant ||
      !restaurant.pickupSlotMinutes ||
      !restaurant.capacityPerSlotDefault
    ) {
      return [];
    }

    const slotDuration = restaurant.pickupSlotMinutes;
    const defaultCapacity = restaurant.capacityPerSlotDefault;

    const openHours = restaurant.openHours as Record<
      string,
      { open: string; close: string }
    > | null;

    if (!openHours || Object.keys(openHours).length === 0) return [];

    const nowTimestamp = Date.now();
    const cutoffTimestamp = nowTimestamp + 30 * 60 * 1000;

    const generatedSlots: { slotStart: Date; slotEnd: Date }[] = [];

    // Obtener fecha actual en Colombia
    const now = new Date();
    const colombiaNowStr = now.toLocaleString('en-US', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const [month, day, year] = colombiaNowStr.split('/').map(Number);
    const colombiaYear = year;
    const colombiaMonth = month - 1;
    const colombiaDate = day;

    for (let d = 0; d <= daysAhead; d++) {
      // Mediodía UTC para evitar bug de timezone
      const midDayUTC = new Date(
        Date.UTC(colombiaYear, colombiaMonth, colombiaDate + d, 12, 0, 0, 0)
      );

      const dayName = midDayUTC
        .toLocaleDateString('en-US', {
          weekday: 'long',
          timeZone: 'America/Bogota',
        })
        .toLowerCase();

      const hours = openHours[dayName];
      if (!hours?.open || !hours?.close) continue;

      const [openHour, openMinute] = hours.open.split(':').map(Number);
      const [closeHour, closeMinute] = hours.close.split(':').map(Number);

      // Base date 00:00 UTC
      const baseDateUTC = new Date(
        Date.UTC(colombiaYear, colombiaMonth, colombiaDate + d, 0, 0, 0, 0)
      );

      // Colombia es UTC-5
      const colombiaOffset = 5;

      let slotStart = new Date(baseDateUTC);
      slotStart.setUTCHours(openHour + colombiaOffset, openMinute, 0, 0);

      const closeTime = new Date(baseDateUTC);
      closeTime.setUTCHours(closeHour + colombiaOffset, closeMinute, 0, 0);

      while (isBefore(slotStart, closeTime)) {
        const slotEnd = addMinutes(slotStart, slotDuration);

        const isToday = d === 0;
        const slotPassed =
          isToday && slotStart.getTime() < cutoffTimestamp;

        if (!slotPassed) {
          generatedSlots.push({
            slotStart: new Date(slotStart),
            slotEnd: new Date(slotEnd),
          });
        }

        slotStart = slotEnd;
      }
    }

    if (generatedSlots.length === 0) return [];

    const firstSlot = generatedSlots[0].slotStart;
    const lastSlotEnd =
      generatedSlots[generatedSlots.length - 1].slotEnd;

    // 🔥 UNA SOLA QUERY DE ÓRDENES
    const confirmedOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        pickupSlotStart: {
          gte: firstSlot,
          lt: lastSlotEnd,
        },
        status: {
          in: ['paid', 'in_progress', 'ready', 'delivered'],
        },
      },
      select: { pickupSlotStart: true },
    });

    const confirmedMap = new Map<number, number>();

    for (const order of confirmedOrders) {
      const key = order.pickupSlotStart.getTime();
      confirmedMap.set(key, (confirmedMap.get(key) || 0) + 1);
    }

    // 🔥 UNA SOLA QUERY DE SLOT CAPACITY
    const slotCapacities = await prisma.slotCapacity.findMany({
      where: {
        restaurantId,
        slotStart: {
          gte: firstSlot,
          lt: lastSlotEnd,
        },
      },
    });

    const capacityMap = new Map(
      slotCapacities.map((s) => [
        s.slotStart.getTime(),
        s,
      ])
    );

    const availableSlots: AvailableSlot[] = [];

    for (const slot of generatedSlots) {
      const key = slot.slotStart.getTime();

      const existing = capacityMap.get(key);
      const confirmed = confirmedMap.get(key) || 0;

      const capacity = existing?.capacity ?? defaultCapacity;
      const reserved = existing?.reserved ?? 0;

      const available = capacity - reserved - confirmed;

      if (available > 0) {
        availableSlots.push({
          slotStart: slot.slotStart,
          slotEnd: slot.slotEnd,
          available,
          capacity,
        });
      }
    }

    return availableSlots;
  } catch (error) {
    console.error(
      `Error getting slots for restaurant ${restaurantId}:`,
      error
    );
    return [];
  }
}

/**
 * ✅ reserveSlot
 *
 * Cuando el usuario selecciona un slot y entra a pagar:
 * - incrementa reserved en SlotCapacity
 *
 * Usa transacción para:
 * 1) leer/crear SlotCapacity
 * 2) contar confirmados reales
 * 3) revisar available
 * 4) si hay espacio: reserved++
 */
export async function reserveSlot(
  restaurantId: string,
  slotStart: Date,
  slotEnd: Date
): Promise<boolean> {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { capacityPerSlotDefault: true },
    });

    if (!restaurant) throw new Error('Restaurant not found');

    return await prisma.$transaction(async (tx) => {

      // 1️⃣ Intentar encontrar o crear el slot
      let slot = await tx.slotCapacity.findUnique({
        where: {
          restaurantId_slotStart: { restaurantId, slotStart },
        },
      });

      if (!slot) {
        slot = await tx.slotCapacity.create({
          data: {
            restaurantId,
            slotStart,
            slotEnd,
            capacity: restaurant.capacityPerSlotDefault,
            reserved: 0,
            confirmed: 0,
          },
        });
      }

      // 2️⃣ Contar confirmados reales
      const confirmedOrdersCount = await tx.order.count({
        where: {
          restaurantId,
          pickupSlotStart: slotStart,
          status: {
            in: ['paid', 'in_progress', 'ready', 'delivered'],
          },
        },
      });

      // 3️⃣ UPDATE CONDICIONAL ATÓMICO
      const updateResult = await tx.slotCapacity.updateMany({
        where: {
          id: slot.id,
          reserved: {
            lt: slot.capacity - confirmedOrdersCount,
          },
        },
        data: {
          reserved: { increment: 1 },
        },
      });

      // Si no se actualizó ninguna fila → no había espacio
      if (updateResult.count === 0) {
        return false;
      }

      return true;
    });
  } catch (error) {
    console.error('Failed to reserve slot:', error);
    return false;
  }
}

/**
 * ✅ confirmSlotReservation
 *
 * Se llama cuando el pago fue aprobado:
 * - reserved-- (ya no está “apartado”)
 * - confirmed++ (marcar como confirmado)
 *
 * Nota: aunque confirmed se actualiza, la disponibilidad real se calcula contando órdenes.
 * Entonces esto es “auxiliar”.
 */
export async function confirmSlotReservation(
  restaurantId: string,
  slotStart: Date
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const slot = await tx.slotCapacity.findUnique({
      where: { restaurantId_slotStart: { restaurantId, slotStart } },
    });

    if (!slot) {
      logger.warn({ restaurantId, slotStart }, 'Slot not found for confirmation');
      return;
    }

    await tx.slotCapacity.update({
      where: { id: slot.id },
      data: {
        reserved: { decrement: 1 },
        confirmed: { increment: 1 },
      },
    });
  });

  logger.info(
    { restaurantId, slotStart: slotStart.toISOString() },
    'Confirmed slot reservation'
  );
}

/**
 * ✅ releaseSlotReservation
 *
 * Se llama cuando:
 * - el pago fue rechazado
 * - el usuario canceló
 *
 * Entonces: reserved--
 */
export async function releaseSlotReservation(
  restaurantId: string,
  slotStart: Date
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const slot = await tx.slotCapacity.findUnique({
      where: { restaurantId_slotStart: { restaurantId, slotStart } },
    });

    if (!slot || slot.reserved === 0) {
      logger.warn({ restaurantId, slotStart }, 'No reservation to release');
      return;
    }

    await tx.slotCapacity.update({
      where: { id: slot.id },
      data: { reserved: { decrement: 1 } },
    });
  });

  logger.info(
    { restaurantId, slotStart: slotStart.toISOString() },
    'Released slot reservation'
  );
}

/**
 * ✅ getSlotDetails
 *
 * Trae un SlotCapacity específico y calcula disponibilidad real:
 * - capacity - reserved - confirmedOrdersCount
 */
export async function getSlotDetails(
  restaurantId: string,
  slotStart: Date
): Promise<AvailableSlot | null> {
  const slot = await prisma.slotCapacity.findUnique({
    where: { restaurantId_slotStart: { restaurantId, slotStart } },
  });

  if (!slot) return null;

  const confirmedOrdersCount = await prisma.order.count({
    where: {
      restaurantId,
      pickupSlotStart: slot.slotStart,
      status: { in: ['paid', 'in_progress', 'ready', 'delivered'] },
    },
  });

  const available = slot.capacity - slot.reserved - confirmedOrdersCount;

  return {
    slotStart: slot.slotStart,
    slotEnd: slot.slotEnd,
    available,
    capacity: slot.capacity,
  };
}
