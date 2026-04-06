/**
 * Servicio orquestador POS
 * Recibe pedidos desde UPIC, identifica qué POS usa cada restaurante,
 * transforma y envía el pedido al conector correspondiente
 */

import { prisma } from '../db';
import { createPOSConnector } from './connectors';
import {
  UPICOrder,
  POSTestResult,
  POSOrderResult,
  POSType,
  POSCredentials,
  RestaurantPOSConfig,
} from './types';
import logger from '../logger';

/**
 * Obtener configuración POS de un restaurante
 */
export async function getRestaurantPOSConfig(
  restaurantId: string
): Promise<RestaurantPOSConfig | null> {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        posType: true,
        posEnabled: true,
        posCredentials: true,
        posLastTestAt: true,
        posLastTestResult: true,
      },
    });

    if (!restaurant) {
      return null;
    }

    return {
      posType: (restaurant.posType as POSType) || null,
      posEnabled: restaurant.posEnabled || false,
      posCredentials: restaurant.posCredentials
        ? (restaurant.posCredentials as POSCredentials)
        : null,
      lastTestAt: restaurant.posLastTestAt || undefined,
      lastTestResult: restaurant.posLastTestResult
        ? (restaurant.posLastTestResult as unknown as POSTestResult)
        : undefined,
    };
  } catch (error) {
    logger.error(
      { error, restaurantId },
      'Error obteniendo configuración POS del restaurante'
    );
    return null;
  }
}

/**
 * Test de conexión con el POS de un restaurante
 */
export async function testPOSConnection(
  restaurantId: string
): Promise<POSTestResult> {
  try {
    const config = await getRestaurantPOSConfig(restaurantId);

    if (!config || !config.posType || !config.posCredentials) {
      return {
        success: false,
        message: 'Configuración POS no encontrada o incompleta',
        error: 'POS no configurado',
      };
    }

    const connector = createPOSConnector(config.posType, config.posCredentials);
    const result = await connector.testConnection();

    // Guardar resultado del test
    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        posLastTestAt: new Date(),
        posLastTestResult: result as any,
      },
    });

    return result;
  } catch (error) {
    logger.error({ error, restaurantId }, 'Error en test de conexión POS');
    return {
      success: false,
      message: 'Error al probar conexión con el POS',
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Enviar pedido al POS
 */
export async function sendOrderToPOS(
  order: UPICOrder
): Promise<POSOrderResult> {
  try {
    const config = await getRestaurantPOSConfig(order.restaurantId);

    if (!config || !config.posEnabled) {
      logger.info(
        { restaurantId: order.restaurantId },
        'POS no configurado o deshabilitado, saltando envío'
      );
      return {
        success: false,
        message: 'POS no configurado o deshabilitado',
        error: 'POS no disponible',
      };
    }

    if (!config.posType || !config.posCredentials) {
      return {
        success: false,
        message: 'Configuración POS incompleta',
        error: 'Credenciales faltantes',
      };
    }

    const connector = createPOSConnector(config.posType, config.posCredentials);
    const result = await connector.sendOrder(order);

    // Guardar log del envío
    await logPOSOrderAttempt(order.orderId, result);

    // Si falló pero es recuperable, guardar para reintentar
    if (!result.success && result.retryable) {
      await saveFailedOrderForRetry(order, result);
    }

    return result;
  } catch (error) {
    logger.error(
      { error, orderId: order.orderId },
      'Error enviando pedido al POS'
    );
    return {
      success: false,
      message: 'Error al enviar pedido al POS',
      error: error instanceof Error ? error.message : 'Error desconocido',
      retryable: true,
    };
  }
}

/**
 * Guardar log de intento de envío a POS
 */
async function logPOSOrderAttempt(
  orderId: string,
  result: POSOrderResult
): Promise<void> {
  try {
    // Crear o actualizar registro en la tabla de logs POS
    // Por ahora, solo logueamos. Se puede crear una tabla específica si es necesario
    logger.info(
      {
        orderId,
        success: result.success,
        posOrderId: result.posOrderId,
        error: result.error,
      },
      'Intento de envío a POS'
    );
  } catch (error) {
    logger.error({ error, orderId }, 'Error guardando log de POS');
  }
}

/**
 * Guardar pedido fallido para reintentar
 */
async function saveFailedOrderForRetry(
  order: UPICOrder,
  result: POSOrderResult
): Promise<void> {
  try {
    // Por ahora, solo logueamos. Se puede implementar una cola de reintentos
    // o una tabla de pedidos fallidos si es necesario
    logger.warn(
      {
        orderId: order.orderId,
        restaurantId: order.restaurantId,
        error: result.error,
      },
      'Pedido fallido guardado para reintento'
    );

    // TODO: Implementar cola de reintentos o tabla de pedidos fallidos
    // Ejemplo: await prisma.failedPOSOrder.create({ data: { ... } });
  } catch (error) {
    logger.error(
      { error, orderId: order.orderId },
      'Error guardando pedido fallido'
    );
  }
}

/**
 * Transformar pedido de UPIC al formato estándar UPICOrder
 * Incluye posItemId cuando está disponible (menú importado desde POS)
 */
export function transformUPICOrderToStandard(
  order: any,
  restaurant: any
): UPICOrder {
  return {
    orderId: order.id,
    items: order.items.map((item: any) => ({
      name: item.product.name,
      qty: item.quantity,
      price: item.unitPrice,
      posItemId: item.product.posItemId || undefined, // CRÍTICO: incluir posItemId si está disponible
      notes: item.notes || undefined,
      options: item.options?.map((opt: any) => ({
        name: opt.productOption.name,
        price: opt.priceDelta,
        priceDelta: opt.priceDelta,
        posOptionId: opt.productOption.posOptionId || undefined, // Si las opciones tienen ID en POS
      })),
    })),
    customer: {
      name: order.student.firstName + ' ' + order.student.lastName,
      phone: order.student.phoneNumber || '',
      email: order.student.email,
    },
    payment: {
      method: order.payment?.method || 'UNKNOWN',
      status: order.payment?.status || 'pending',
      amount: order.totalAmount,
      transactionId: order.payment?.providerRef || undefined,
    },
    notes: order.notes || undefined,
    restaurantId: order.restaurantId,
    restaurantName: restaurant.name,
    totalAmount: order.totalAmount,
    createdAt: order.createdAt.toISOString(),
    pickupCode: order.pickupCode,
    serviceMode: order.serviceMode || undefined,
  };
}
