/**
 * GET /api/admin/restaurant/settings - Get restaurant settings
 * PATCH /api/admin/restaurant/settings - Update restaurant settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getAdminRestaurant } from '../../../../../lib/admin-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const restaurantId = await getAdminRestaurant(req);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Now use Prisma normally
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        openHours: true,
        pickupSlotMinutes: true,
        capacityPerSlotDefault: true,
        allowEatIn: true,
        allowTakeout: true,
        allowInternalDelivery: true,
        deliveryFee: true,
        takeoutFee: true,
        type: true,
      },
    });

    const restaurantData = restaurant;

    if (!restaurantData) {
      return NextResponse.json(
        { success: false, error: 'Restaurante no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { 
        restaurant: {
          ...restaurantData,
          allowEatIn: restaurantData.allowEatIn ?? true,
          allowTakeout: restaurantData.allowTakeout ?? true,
          allowInternalDelivery: restaurantData.allowInternalDelivery ?? false,
          deliveryFee: restaurantData.deliveryFee ?? 0,
          takeoutFee: restaurantData.takeoutFee ?? 0,
        }
      },
    });
  } catch (error) {
    console.error('Error fetching restaurant settings:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener configuración' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const restaurantId = await getAdminRestaurant(req);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      openHours,
      pickupSlotMinutes,
      capacityPerSlotDefault,
      allowEatIn,
      allowTakeout,
      allowInternalDelivery,
      deliveryFee,
      takeoutFee,
    } = body;

    const current = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        allowEatIn: true,
        allowTakeout: true,
        allowInternalDelivery: true,
      },
    });

    const effectiveEatIn = allowEatIn ?? current?.allowEatIn ?? false;
    const effectiveTakeout = allowTakeout ?? current?.allowTakeout ?? false;
    const effectiveDelivery = allowInternalDelivery ?? current?.allowInternalDelivery ?? false;

    if (!effectiveEatIn && !effectiveTakeout && !effectiveDelivery) {
      return NextResponse.json(
        {
          success: false,
          error: 'Debe haber al menos un tipo de pedido activo',
        },
        { status: 400 }
      );
    }

    // Validate pickupSlotMinutes
    if (
      pickupSlotMinutes !== undefined &&
      (pickupSlotMinutes < 5 || pickupSlotMinutes > 60)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'La duración de las franjas debe estar entre 5 y 60 minutos',
        },
        { status: 400 }
      );
    }

    // Validate capacityPerSlotDefault
    if (
      capacityPerSlotDefault !== undefined &&
      (capacityPerSlotDefault < 1 || capacityPerSlotDefault > 100)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'La capacidad por franja debe estar entre 1 y 100',
        },
        { status: 400 }
      );
    }

    const updateData: any = {};

    // Validate and normalize openHours format
    if (openHours !== undefined) {
      const normalizedHours: Record<string, { open: string; close: string }> =
        {};
      for (const [day, hours] of Object.entries(openHours)) {
        if (
          hours &&
          typeof hours === 'object' &&
          'open' in hours &&
          'close' in hours
        ) {
          // Ensure time format is HH:MM (24-hour format)
          const hoursObj = hours as { open: string; close: string };
          const openTime = hoursObj.open.trim();
          const closeTime = hoursObj.close.trim();

          // Validate format HH:MM
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(openTime) || !timeRegex.test(closeTime)) {
            return NextResponse.json(
              {
                success: false,
                error: `Formato de hora inválido para ${day}. Use formato HH:MM (24 horas)`,
              },
              { status: 400 }
            );
          }

          normalizedHours[day] = {
            open: openTime,
            close: closeTime,
          };
        }
      }
      // Explicitly set openHours to only include open days
      // This ensures closed days are removed from the database
      updateData.openHours = normalizedHours;

      console.log('Normalized openHours:', {
        receivedDays: Object.keys(openHours),
        normalizedDays: Object.keys(normalizedHours),
        normalizedHours,
      });
    }

    if (pickupSlotMinutes !== undefined) {
      updateData.pickupSlotMinutes = pickupSlotMinutes;
    }
    if (capacityPerSlotDefault !== undefined) {
      updateData.capacityPerSlotDefault = capacityPerSlotDefault;
    }
    if (allowTakeout !== undefined) {
      updateData.allowTakeout = allowTakeout;
    }
    if (allowEatIn !== undefined) {
      updateData.allowEatIn = allowEatIn;
    }

    if (allowInternalDelivery !== undefined) {
      updateData.allowInternalDelivery = allowInternalDelivery;
    }
    if (deliveryFee !== undefined) {
      // Validate deliveryFee is a non-negative integer (in cents)
      if (typeof deliveryFee !== 'number' || deliveryFee < 0 || !Number.isInteger(deliveryFee)) {
        return NextResponse.json(
          {
            success: false,
            error: 'El costo del domicilio debe ser un número entero no negativo (en centavos)',
          },
          { status: 400 }
        );
      }
      updateData.deliveryFee = deliveryFee;
    }

    if (takeoutFee !== undefined) {
      // Validate takeoutFee is non-negative integer (in cents)
      if (
        typeof takeoutFee !== 'number' ||
        takeoutFee < 0 ||
        !Number.isInteger(takeoutFee)
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              'El recargo por pedido para llevar debe ser un número entero no negativo (en centavos)',
          },
          { status: 400 }
        );
      }

      updateData.takeoutFee = takeoutFee;
    }

    // Now use Prisma normally
    const restaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: updateData,
      select: {
        id: true,
        name: true,
        openHours: true,
        pickupSlotMinutes: true,
        capacityPerSlotDefault: true,
        allowEatIn: true,
        allowTakeout: true,
        allowInternalDelivery: true,
        deliveryFee: true,
        takeoutFee: true,
        type: true,
      },
    });

    console.log('Restaurant settings updated:', restaurant);

    return NextResponse.json({
      success: true,
      data: { 
        restaurant: {
          ...restaurant,
          allowEatIn: restaurant.allowEatIn ?? true,
          allowTakeout: restaurant.allowTakeout ?? true,
          allowInternalDelivery: restaurant.allowInternalDelivery ?? false,
          deliveryFee: restaurant.deliveryFee ?? 0,
          takeoutFee: restaurant.takeoutFee ?? 0,
        }
      },
    });
  } catch (error) {
    console.error('Error updating restaurant settings:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar configuración' },
      { status: 500 }
    );
  }
}
