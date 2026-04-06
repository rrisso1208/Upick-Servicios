/**
 * POST /api/orders
 * Create a new order
 *
 * ✅ Qué hace este endpoint (resumen):
 * 1) Aplica seguridad (rate limit + CSRF)
 * 2) Autentica usuario (Bearer token o cookies)
 * 3) Valida que sea estudiante
 * 4) Valida request body con Zod (createOrderSchema)
 * 5) Verifica estado del restaurante (overloaded)
 * 6) Determina el slot de recogida (elegido o auto)
 * 7) Valida items: existencia, inventario, horarios, capacidad por hora
 * 8) Calcula total: items + opciones + delivery + cupón + service fee
 * 9) Valida datos de factura si needsInvoice
 * 10) Crea la orden en BD con status awaiting_payment
 * 11) Registra redención cupón y decrementa inventario
 * 12) Devuelve la orden creada
 *
 * ⚠️ Importante:
 * - NO reserva el slot con reserveSlot().
 * - Entonces el "anti-fila" por slots depende de otras partes del sistema
 *   o queda vulnerable a sobrecupos si muchos crean órdenes simultáneamente.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createOrderSchema } from '@/lib/validations/order';
import { getAuthUser, getAuthUserFromHeader } from '@/lib/auth';
import { generatePickupCode } from '@/lib/utils';
import { getAvailableSlots } from '@/lib/slots';
import logger from '../../../lib/logger';
import { addMinutes } from 'date-fns';
import { decrementInventory } from '@/lib/inventory';
import { rateLimiters } from '@/lib/rate-limit';
import { applySecurity, getUserIdFromRequest } from '@/lib/api-security';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  /**
   * 0) Seguridad global
   * - Rate limiter: máximo 10 creaciones de pedido por minuto (por usuario/IP según implementación)
   * - CSRF: exige token/validación (evita requests cross-site maliciosos)
   */
  const securityResponse = await applySecurity(req, {
    rateLimiter: rateLimiters.orderCreation,
    requireCSRF: true,
    getUserId: getUserIdFromRequest,
  });

  // Si applySecurity detecta bloqueo / falta CSRF, responde y salimos.
  if (securityResponse) {
    return securityResponse;
  }

  try {
    /**
     * 1) Autenticación
     *
     * Regla:
     * - Si hay Authorization: Bearer <token> => valida contra Supabase (service role) usando getAuthUserFromHeader
     * - Si NO hay Bearer => intenta cookies (getAuthUser) (para SSR o requests desde server)
     *
     * Además loguean headers para debug (muy útil cuando falla auth en producción).
     */
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization');
    let user;

    const allHeaders: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      allHeaders[key] = value.substring(0, 50); // recorta valores largos por seguridad/log
    });

    logger.info(
      {
        hasAuthHeader: !!authHeader,
        authHeaderValue: authHeader ? `${authHeader.substring(0, 20)}...` : null,
        headerKeys: Array.from(req.headers.keys()),
        allHeaders,
      },
      'Checking authentication for order creation'
    );

    // 1A) Auth por Bearer token (típico en requests client-side)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      logger.info(
        {
          tokenLength: authHeader.length,
          tokenPreview: authHeader.substring(0, 30) + '...',
        },
        'Using Authorization header for authentication'
      );

      user = await getAuthUserFromHeader(authHeader);

      if (!user) {
        /**
         * Si vino Bearer token pero es inválido/expirado:
         * - NO hacen fallback a cookies
         * - Responden 401 directamente (correcto desde seguridad)
         */
        logger.error(
          {
            authHeaderExists: !!authHeader,
            authHeaderStartsWithBearer: authHeader?.startsWith('Bearer '),
            tokenLength: authHeader?.length,
          },
          'getAuthUserFromHeader returned null - token may be invalid or expired'
        );
        return NextResponse.json(
          { error: 'Unauthorized - Invalid or expired token' },
          { status: 401 }
        );
      } else {
        logger.info(
          { userId: user.id, email: user.email },
          'Successfully authenticated via Authorization header'
        );
      }
    } else {
      // 1B) Fallback a cookies (típico SSR)
      logger.info(
        {
          hasAuthHeader: !!authHeader,
          authHeaderValue: authHeader ? authHeader.substring(0, 30) + '...' : null,
        },
        'No Authorization header found, using cookie-based authentication'
      );

      try {
        user = await getAuthUser();
      } catch (error: any) {
        /**
         * Si falla cookies auth:
         * - Asumen que era una request client-side que DEBÍA traer Bearer
         */
        logger.warn(
          { error: error?.message },
          'Cookie-based auth failed - this may be a client-side request missing Authorization header'
        );
        return NextResponse.json(
          { error: 'Unauthorized - No valid authentication found' },
          { status: 401 }
        );
      }
    }

    // 1C) Verificaciones finales
    if (!user) {
      logger.warn({ hasAuthHeader: !!authHeader }, 'No user found in authentication');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Este endpoint solo lo puede usar un estudiante
    if (user.role !== 'student') {
      logger.warn({ userId: user.id, role: user.role }, 'User is not a student');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info({ userId: user.id, email: user.email }, 'User authenticated successfully');

    /**
     * 2) Parseo y validación del body
     * createOrderSchema es un Zod schema que valida estructura y tipos.
     * Luego extraen needsInvoice e invoiceDataId (vienen del body "crudo").
     */
    const body = await req.json();
    const validated = createOrderSchema.parse(body);
    const { needsInvoice, invoiceDataId } = body;

    /**
     * 3) Verificar que el restaurante exista y obtener config rápida:
     * - isOverloaded/overloadUntil: para bloquear pedidos por saturación
     * - pickupSlotMinutes: duración slot
     * - freeFeeThreshold/lowOrderFee: fee por pedido pequeño
     */
    const restaurant = (await prisma.restaurant.findUnique({
      where: { id: validated.restaurantId },
      select: {
        isOverloaded: true,
        overloadUntil: true,
        pickupSlotMinutes: true,
        freeFeeThreshold: true,
        lowOrderFee: true,
        takeoutFee: true,
      } as any,
    })) as {
      isOverloaded: boolean;
      overloadUntil: Date | null;
      pickupSlotMinutes: number | null;
      freeFeeThreshold: number;
      lowOrderFee: number;
      takeoutFee: number;
    } | null;

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    /**
     * 4) Manejo de "restaurante sobre pedidos"
     * - Si está overloaded y todavía no se cumple overloadUntil => 503 con mensaje al usuario.
     * - Si ya pasó el tiempo => auto-apaga la bandera.
     */
    if (restaurant.isOverloaded) {
      if (restaurant.overloadUntil && new Date() < restaurant.overloadUntil) {
        const minutesLeft = Math.ceil(
          (restaurant.overloadUntil.getTime() - new Date().getTime()) / 60000
        );
        return NextResponse.json(
          {
            error: 'Restaurante sobre pedidos',
            message: `El restaurante está a full capacidad y no está recibiendo pedidos en este momento. Intenta nuevamente en ${minutesLeft} minutos.`,
            overloadUntil: restaurant.overloadUntil,
          },
          { status: 503 }
        );
      } else {
        await prisma.restaurant.update({
          where: { id: validated.restaurantId },
          data: { isOverloaded: false, overloadUntil: null },
        });
      }
    }

    /**
     * 5) Determinar el pickup slot del pedido
     *
     * Caso A) El frontend manda desiredSlot:
     * - se toma ese inicio y se calcula el fin usando pickupSlotMinutes
     *
     * Caso B) No manda:
     * - se pide el siguiente slot disponible con getAvailableSlots(..., 1)
     * - se escoge slots[0]
     *
     * ⚠️ Nota importante:
     * - aquí SOLO seleccionan/guardan el slot.
     * - NO hacen reserveSlot() (no incrementan reserved).
     */
    let pickupSlotStart: Date;
    let pickupSlotEnd: Date;

    if (validated.desiredSlot) {
      pickupSlotStart = new Date(validated.desiredSlot);
      pickupSlotEnd = addMinutes(pickupSlotStart, restaurant.pickupSlotMinutes || 10);
    } else {
      const slots = await getAvailableSlots(validated.restaurantId, 1);
      if (!slots.length) {
        return NextResponse.json({ error: 'No available pickup slots' }, { status: 400 });
      }
      pickupSlotStart = slots[0].slotStart;
      pickupSlotEnd = slots[0].slotEnd;
    }

    /**
     * Helper: convertir pickupSlotStart (UTC representando Colombia) a minutos Colombia.
     * slotStartUTC = colombia + 5 => colombia = utc - 5
     */
    const getPickupMinutesColombia = (d: Date): number => {
      const COLOMBIA_OFFSET_HOURS = 5;
      const utcH = d.getUTCHours();
      const utcM = d.getUTCMinutes();
      const colombiaH = (utcH - COLOMBIA_OFFSET_HOURS + 24) % 24;
      return colombiaH * 60 + utcM;
    };

    const pickupMinutesColombia = getPickupMinutesColombia(pickupSlotStart);

    /**
     * 6) Validar items, inventario, horarios de venta y capacidad por hora
     * y calcular totalAmount
     */
    let totalAmount = 0;
    const itemsData = [];

    // ⚠️ Ojo: productHour se calcula con pickupSlotStart.getHours()
    // pero pickupSlotStart viene "en UTC representando Colombia", según slots.ts.
    // Esto puede ser un punto de bugs si no se controla bien la TZ.
    const productHour = pickupSlotStart.getHours();

    for (const item of validated.items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: {
          optionGroups: { include: { options: true } },
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

      if (!product || !product.isActive) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found or inactive` },
          { status: 400 }
        );
      }

      /**
       * 6A) Inventario (si inventoryEnabled)
       * - Si no hay suficiente => 400 con mensaje user-friendly
       */
      if (product.inventoryEnabled && product.inventoryQuantity !== null) {
        if (product.inventoryQuantity < item.quantity) {
          return NextResponse.json(
            {
              error: 'Inventario insuficiente',
              message: `Solo hay ${product.inventoryQuantity} unidades disponibles de "${product.name}". Solicitaste ${item.quantity}.`,
              productName: product.name,
              available: product.inventoryQuantity,
              requested: item.quantity,
            },
            { status: 400 }
          );
        }
      }

      /**
       * 6B) Restricción por horas de venta de la categoría
       * - calculan hora actual en Colombia con un offset fijo UTC-5
       * - comparan con saleHoursStart/saleHoursEnd (HH:mm)
       */
      if (product.category.saleHoursStart || product.category.saleHoursEnd) {
        if (product.category.saleHoursStart) {
          const [startHour, startMin] = product.category.saleHoursStart.split(':').map(Number);
          const startMinutes = startHour * 60 + startMin;

          if (pickupMinutesColombia < startMinutes) {
            return NextResponse.json(
              {
                error: `El producto "${product.name}" de la categoría "${product.category.name}" solo se puede recoger a partir de las ${product.category.saleHoursStart}`,
              },
              { status: 400 }
            );
          }
        }

        if (product.category.saleHoursEnd) {
          const [endHour, endMin] = product.category.saleHoursEnd.split(':').map(Number);
          const endMinutes = endHour * 60 + endMin;

          if (pickupMinutesColombia >= endMinutes) {
            return NextResponse.json(
              {
                error: `El producto "${product.name}" de la categoría "${product.category.name}" solo se puede recoger hasta las ${product.category.saleHoursEnd}`,
              },
              { status: 400 }
            );
          }
        }
      }

      /**
       * 6C) Capacidad por producto por hora (ProductCapacity)
       * - buscan un registro: (restaurantId, productId, hour)
       * - si existe y capacity > 0:
       *    cuentan cuántos orderItems ya se pidieron para esa hora
       *    (filtran órdenes por pickupSlotStart entre hour y hour+1)
       * - si supera => 400 con mensaje
       *
       * ⚠️ Importante:
       * - cuentan también awaiting_payment => o sea, pedidos sin pagar cuentan como consumiendo cupos.
       *   Esto reduce overselling, pero puede “bloquear” si mucha gente abandona pagos.
       */
      const productCapacity = await prisma.productCapacity.findUnique({
        where: {
          restaurantId_productId_hour: {
            restaurantId: validated.restaurantId,
            productId: item.productId,
            hour: productHour,
          },
        },
      });

      if (productCapacity && productCapacity.capacity > 0) {
        const ordersInSlot = await prisma.orderItem.count({
          where: {
            productId: item.productId,
            order: {
              restaurantId: validated.restaurantId,
              pickupSlotStart: {
                gte: new Date(
                  pickupSlotStart.getFullYear(),
                  pickupSlotStart.getMonth(),
                  pickupSlotStart.getDate(),
                  productHour,
                  0,
                  0
                ),
                lt: new Date(
                  pickupSlotStart.getFullYear(),
                  pickupSlotStart.getMonth(),
                  pickupSlotStart.getDate(),
                  productHour + 1,
                  0,
                  0
                ),
              },
              status: {
                in: ['awaiting_payment', 'paid', 'in_progress', 'ready'],
              },
            },
          },
        });

        const totalRequested = ordersInSlot + item.quantity;

        if (totalRequested > productCapacity.capacity) {
          const available = Math.max(0, productCapacity.capacity - ordersInSlot);
          return NextResponse.json(
            {
              error: 'Capacidad excedida',
              message: `Solo hay ${available} unidades disponibles de "${product.name}" para las ${productHour}:00. Ya se han pedido ${ordersInSlot} de ${productCapacity.capacity} disponibles.`,
              productName: product.name,
              available,
              requested: item.quantity,
            },
            { status: 400 }
          );
        }
      }

      /**
       * 6D) Calcular itemTotal (precio efectivo * cantidad) + opciones
       * ✅ Si hay promotionPrice (>0), ese es el precio que se cobra y el que se guarda en la orden.
       */
      const effectiveUnitPrice =
        product.promotionPrice && product.promotionPrice > 0
          ? product.promotionPrice
          : product.price;

      let itemTotal = effectiveUnitPrice * item.quantity;

      const optionsData: Array<{ productOptionId: string; priceDelta: number }> = [];

      if (item.options) {
        for (const opt of item.options) {
          const option = await prisma.productOption.findUnique({
            where: { id: opt.productOptionId },
            select: { priceDelta: true }, // ✅ solo lo que necesitas
          });

          if (option) {
            itemTotal += option.priceDelta * item.quantity;
            optionsData.push({
              productOptionId: opt.productOptionId,
              priceDelta: option.priceDelta,
            });
          }
        }
      }

      totalAmount += itemTotal;

      itemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: effectiveUnitPrice, // ✅ guardamos el precio realmente cobrado
        notes: item.notes,
        options: optionsData,
      });
    }

    /**
     * 7) Delivery cost (solo si internal_delivery)
     */
    const deliveryCost = validated.deliveryCost || 0;
    if (validated.serviceMode === 'internal_delivery' && deliveryCost > 0) {
      totalAmount += deliveryCost;
    }

    /**
     * 7.5) Takeout fee (solo si takeaway)
     */
    let takeoutFeeAmount = 0;
    if (validated.serviceMode === 'takeaway' && restaurant.takeoutFee > 0) {
      takeoutFeeAmount = restaurant.takeoutFee;
      totalAmount += takeoutFeeAmount;
    }

    /**
     * 8) Cupón (si couponCode)
     * - valida existencia/activo/fechas/restaurante/mínimo/maxUses
     * - calcula discountAmount
     * - reduce totalAmount
     */
    let couponId: string | null = null;
    let discountAmount = 0;

    if (validated.couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: validated.couponCode.toUpperCase() },
      });

      if (coupon && coupon.isActive) {
        const now = new Date();
        if (
          now >= coupon.validFrom &&
          now <= coupon.validUntil &&
          (!coupon.restaurantId || coupon.restaurantId === validated.restaurantId) &&
          (!coupon.minOrderAmount || totalAmount >= coupon.minOrderAmount) &&
          (!coupon.maxUses || coupon.usedCount < coupon.maxUses)
        ) {
          couponId = coupon.id;

          if (coupon.discountType === 'percentage') {
            discountAmount = Math.floor((totalAmount * coupon.discountValue) / 100);
          } else {
            discountAmount = Math.min(coupon.discountValue, totalAmount);
          }

          totalAmount = Math.max(0, totalAmount - discountAmount);
        }
      }
    }

    /**
     * 9) Service fee (cargo por pedido pequeño)
     *
     * Regla:
     * - Se calcula sobre subtotal ANTES de descuento (y antes de delivery)
     * - Si subtotalBeforeDiscount < freeFeeThreshold => serviceFee = lowOrderFee
     *
     * Luego hacen chequeo de seguridad:
     * - comparan valor enviado por frontend vs valor calculado
     * - si difiere más de 1 => confían en backend
     */
    const restaurantConfig = (await prisma.restaurant.findUnique({
      where: { id: validated.restaurantId },
      select: { freeFeeThreshold: true, lowOrderFee: true, deliveryFee: true } as any,
    })) as { freeFeeThreshold: number; lowOrderFee: number; deliveryFee: number } | null;

    let serviceFeeAmount = 0;

    if (restaurantConfig && restaurantConfig.freeFeeThreshold && restaurantConfig.freeFeeThreshold > 0) {
      const subtotalBeforeDiscount = totalAmount + discountAmount - deliveryCost;

      if (subtotalBeforeDiscount < restaurantConfig.freeFeeThreshold) {
        serviceFeeAmount = restaurantConfig.lowOrderFee || 0;
      }
    }

    const frontendServiceFee = validated.serviceFeeAmount || 0;

    if (Math.abs(frontendServiceFee - serviceFeeAmount) > 1) {
      logger.warn(
        {
          orderId: 'pending',
          restaurantId: validated.restaurantId,
          frontendServiceFee,
          calculatedServiceFee: serviceFeeAmount,
          difference: Math.abs(frontendServiceFee - serviceFeeAmount),
          subtotalBeforeDiscount: totalAmount + discountAmount - deliveryCost,
          threshold: restaurantConfig?.freeFeeThreshold,
        },
        'Service fee mismatch between frontend and backend calculation'
      );
      // Se quedan con el backend-calculated
    } else {
      // Si coincide, usan el del frontend (evitar redondeos)
      serviceFeeAmount = frontendServiceFee;
    }

    totalAmount += serviceFeeAmount;

    /**
     * 10) Facturación (needsInvoice)
     * - Si invoiceDataId viene: valida que sea del usuario
     * - Si no viene: intenta usar datos guardados del usuario
     */
    let finalInvoiceDataId = null;
    if (needsInvoice) {
      if (invoiceDataId) {
        const invoiceData = await prisma.invoiceData.findUnique({
          where: { id: invoiceDataId },
        });
        if (!invoiceData || invoiceData.userId !== user.id) {
          return NextResponse.json({ error: 'Datos de facturación inválidos' }, { status: 400 });
        }
        finalInvoiceDataId = invoiceDataId;
      } else {
        const savedInvoiceData = await prisma.invoiceData.findUnique({
          where: { userId: user.id },
        });
        if (savedInvoiceData) {
          finalInvoiceDataId = savedInvoiceData.id;
        } else {
          return NextResponse.json(
            { error: 'No se encontraron datos de facturación guardados' },
            { status: 400 }
          );
        }
      }
    }

    /**
     * 11) Determinar serviceMode final
     * - Prefiere validated.serviceMode
     * - si no existe, lo deriva de validated.orderType
     */
    let serviceMode: 'eat_in' | 'takeaway' | 'internal_delivery' = 'takeaway';
    if (validated.serviceMode) serviceMode = validated.serviceMode;
    else if (validated.orderType === 'eat_in') serviceMode = 'eat_in';
    else serviceMode = 'takeaway';

    /**
     * 11.5) Validar y aplicar créditos
     */
    let creditsUsed = 0;
    if (validated.creditsToUse && validated.creditsToUse > 0) {
      const userCredit = await prisma.userCredit.findUnique({
        where: { userId: user.id },
      });

      if (userCredit && userCredit.balance > 0) {
        // No podemos usar más créditos de los que tiene el usuario,
        // ni más del total de la orden
        creditsUsed = Math.min(
          validated.creditsToUse,
          userCredit.balance,
          totalAmount
        );
      }
    }

    /**
     * 12) Construir orderData para prisma.order.create
     *
     * status inicial: awaiting_payment
     * pickupCode: se genera aquí
     * items: se crean en nested create (OrderItem + options)
     */
    const orderData: any = {
      placeId: validated.universityId, // ⚠️ renombrado (schema usa universityId, DB usa placeId)
      restaurantId: validated.restaurantId,
      studentId: user.id,
      status: 'awaiting_payment',
      totalAmount,
      couponId,
      discountAmount,
      creditsUsed, // Guardamos los créditos a usar en la orden
      needsInvoice: needsInvoice || false,
      invoiceDataId: finalInvoiceDataId,
      consentToSavePaymentMethod: validated.consentToSavePaymentMethod || false,
      type: validated.orderType || 'takeout', // deprecated
      serviceMode,
      deliveryPointId: validated.deliveryPointId || null,
      deliveryCost,
      takeoutFeeAmount,
      serviceFeeAmount,
      customerPhone: validated.customerPhone || null,
      pickupSlotStart,
      pickupSlotEnd,
      pickupCode: generatePickupCode(),
      notes: validated.notes,
      tableId: validated.tableId || null,
      items: {
        create: itemsData.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes,
          options: { create: item.options },
        })),
      },
    };

    const order = await prisma.order.create({
      data: orderData,
      include: {
        items: { include: { product: true, options: true } },
        restaurant: true,
      },
    });

    /**
     * 13) Si hubo cupón: registrar redención y actualizar usedCount
     */
    if (couponId) {
      await prisma.couponRedemption.create({
        data: { couponId, orderId: order.id, userId: user.id },
      });

      await prisma.coupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } },
      });
    }

    /**
     * 14) Decrementar inventario
     * ⚠️ Importante: esto se hace aunque el pedido está awaiting_payment.
     * Si el usuario no paga, deben REVERTIR inventario en otro flujo (cancelación/timeout).
     * Si no hay esa reversión, se pierde stock.
     */
    for (const item of validated.items) {
      await decrementInventory(item.productId, item.quantity, order.id);
    }

    logger.info(
      {
        orderId: order.id,
        studentId: order.studentId,
        userId: user.id,
        totalAmount,
        discountAmount,
        status: order.status,
      },
      'Order created'
    );

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    /**
     * Manejo de error:
     * - Si es Error normal => 400 con message
     * - Si no => 500
     *
     * Nota: si createOrderSchema.parse falla (Zod), cae aquí como error.
     */
    if (error instanceof Error) {
      logger.error({ error: error.message }, 'Failed to create order');
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
