/**
 * Inventory management utilities
 */

import { prisma } from './db';
import logger from './logger';

/**
 * Check if product has sufficient inventory
 */
export async function checkInventory(
  productId: string,
  quantity: number
): Promise<{ available: boolean; currentQuantity: number | null }> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      inventoryEnabled: true,
      inventoryQuantity: true,
    },
  });

  if (
    !product ||
    !product.inventoryEnabled ||
    product.inventoryQuantity === null
  ) {
    // Inventory not enabled or not set - allow order
    return { available: true, currentQuantity: null };
  }

  const currentQuantity = product.inventoryQuantity;
  const available = currentQuantity >= quantity;

  return { available, currentQuantity };
}

/**
 * Decrement inventory for a product and check for alerts
 */
export async function decrementInventory(
  productId: string,
  quantity: number,
  orderId: string
): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      restaurantId: true,
      inventoryEnabled: true,
      inventoryQuantity: true,
      inventoryAlertThreshold: true,
    },
  });

  if (
    !product ||
    !product.inventoryEnabled ||
    product.inventoryQuantity === null
  ) {
    // Inventory not enabled - nothing to do
    return;
  }

  const currentQuantity = product.inventoryQuantity;
  const newQuantity = Math.max(0, currentQuantity - quantity);

  // Update product inventory
  await prisma.product.update({
    where: { id: productId },
    data: {
      inventoryQuantity: newQuantity,
    },
  });

  logger.info(
    {
      productId,
      productName: product.name,
      orderId,
      quantity,
      oldQuantity: currentQuantity,
      newQuantity,
    },
    'Inventory decremented'
  );

  // Check if we need to create an alert
  if (
    product.inventoryAlertThreshold !== null &&
    newQuantity <= product.inventoryAlertThreshold &&
    currentQuantity > product.inventoryAlertThreshold
  ) {
    // Inventory just dropped below threshold - create alert
    await createInventoryAlert(
      productId,
      product.name,
      product.restaurantId,
      newQuantity,
      product.inventoryAlertThreshold
    );
  }
}

/**
 * Create inventory alert
 * Uses transaction to prevent duplicate unresolved alerts (enforced by unique partial index)
 */
async function createInventoryAlert(
  productId: string,
  productName: string,
  restaurantId: string,
  currentQuantity: number,
  threshold: number
): Promise<void> {
  try {
    // Use transaction to atomically check and create/update alert
    // The unique partial index at DB level ensures only one unresolved alert per product
    const result = await prisma.$transaction(async (tx) => {
      // Check if there's already an unresolved alert for this product
      const existingAlert = await tx.inventoryAlert.findFirst({
        where: {
          productId,
          isResolved: false,
        },
      });

      if (existingAlert) {
        // Update existing alert
        const updated = await tx.inventoryAlert.update({
          where: { id: existingAlert.id },
          data: {
            currentQuantity,
            threshold, // Update threshold in case it changed
          },
        });
        return { alert: updated, isNew: false };
      } else {
        // Create new alert
        // The unique partial index will prevent duplicates even in race conditions
        const created = await tx.inventoryAlert.create({
          data: {
            productId,
            productName,
            restaurantId,
            currentQuantity,
            threshold,
            isResolved: false,
          },
        });
        return { alert: created, isNew: true };
      }
    });

    // Only send notifications if this is a new alert
    if (result.isNew) {
      logger.info(
        { productId, alertId: result.alert.id, currentQuantity, threshold },
        'Created new inventory alert'
      );

      // Get restaurant admins to send notifications
      const restaurantAdmins = await prisma.user.findMany({
        where: {
          restaurantId,
          role: 'restaurant_admin',
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
        },
      });

      // Create notification for each restaurant admin
      if (restaurantAdmins.length > 0) {
        // Import WhatsApp notification function
        const { sendWhatsAppMessage } = await import('./notifications/whatsapp');
        
        for (const admin of restaurantAdmins) {
          // Create in-app notification
          await prisma.notification.create({
            data: {
              type: 'INVENTORY_LOW',
              title: 'Inventario Bajo',
              message: `El producto "${productName}" tiene ${currentQuantity} unidades disponibles (umbral: ${threshold})`,
              userId: admin.id,
              metadata: {
                productId,
                productName,
                restaurantId,
                currentQuantity,
                threshold,
                alertId: result.alert.id,
              },
            },
          });

          // Send WhatsApp notification if phone number is configured
          if (admin.phoneNumber) {
            try {
              const whatsappMessage = `🔔 *Alerta de Inventario*

El producto *${productName}* ha bajado del umbral configurado.

📦 Unidades actuales: ${currentQuantity}
⚠️ Umbral configurado: ${threshold}

Por favor revisa el inventario en el panel de administración.`;
              
              await sendWhatsAppMessage(admin.phoneNumber, whatsappMessage);
              
              logger.info(
                {
                  productId,
                  productName,
                  adminId: admin.id,
                  phoneNumber: admin.phoneNumber,
                },
                'Sent WhatsApp notification for inventory alert'
              );
            } catch (error) {
              logger.error(
                {
                  error,
                  productId,
                  adminId: admin.id,
                  phoneNumber: admin.phoneNumber,
                },
                'Failed to send WhatsApp notification for inventory alert'
              );
              // Don't fail the whole process if WhatsApp fails
            }
          }
        }

        logger.info(
          {
            productId,
            productName,
            restaurantId,
            adminCount: restaurantAdmins.length,
          },
          'Created inventory low notifications for restaurant admins'
        );
      } else {
        logger.warn(
          { productId, restaurantId },
          'No restaurant admins found to notify about inventory alert'
        );
      }
    } else {
      logger.info(
        { productId, alertId: result.alert.id, currentQuantity },
        'Updated existing inventory alert (no new notifications sent)'
      );
    }
  } catch (error) {
    // Check if error is due to unique constraint violation (race condition handled by DB)
    if (
      error instanceof Error &&
      (error.message.includes('unique constraint') ||
        error.message.includes('duplicate key') ||
        error.message.includes('InventoryAlert_productId_unresolved_unique'))
    ) {
      // Another process created the alert simultaneously, which is fine
      // The unique partial index prevented the duplicate
      logger.info(
        { productId },
        'Alert already exists (race condition handled by unique index)'
      );
      return;
    }

    logger.error(
      { error, productId, productName },
      'Failed to create inventory alert'
    );
    // Don't throw - alert creation failure shouldn't block order creation
  }
}

/**
 * Restore inventory when order is cancelled
 */
export async function restoreInventory(
  productId: string,
  quantity: number
): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      inventoryEnabled: true,
      inventoryQuantity: true,
      inventoryAlertThreshold: true,
    },
  });

  if (
    !product ||
    !product.inventoryEnabled ||
    product.inventoryQuantity === null
  ) {
    return;
  }

  const currentQuantity = product.inventoryQuantity;
  const newQuantity = currentQuantity + quantity;

  await prisma.product.update({
    where: { id: productId },
    data: {
      inventoryQuantity: newQuantity,
    },
  });

  // If inventory is restored above threshold, resolve any alerts
  if (
    product.inventoryAlertThreshold !== null &&
    newQuantity > product.inventoryAlertThreshold
  ) {
    await prisma.inventoryAlert.updateMany({
      where: {
        productId,
        isResolved: false,
      },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
      },
    });
  }

  logger.info(
    {
      productId,
      quantity,
      oldQuantity: currentQuantity,
      newQuantity,
    },
    'Inventory restored'
  );
}
