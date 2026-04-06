/**
 * Servicio de sincronización de menú desde POS
 * Maneja la importación y sincronización de menú desde sistemas POS
 */

import { prisma } from '../db';
import logger from '../logger';
import { createPOSConnector } from './connectors';
import { POSMenu, POSType, POSCredentials, MenuSource } from './types';
import { Prisma, NotificationType } from '@prisma/client';

export interface MenuSyncChanges {
  priceChanges: Array<{
    productId: string;
    productName: string;
    oldPrice: number;
    newPrice: number;
  }>;
  inventoryChanges: Array<{
    productId: string;
    productName: string;
    oldQuantity: number | null;
    newQuantity: number | null;
  }>;
  newProducts: Array<{
    productId: string;
    productName: string;
  }>;
  deactivatedProducts: Array<{
    productId: string;
    productName: string;
  }>;
}

export interface MenuSyncResult {
  success: boolean;
  message: string;
  imported: {
    categories: number;
    products: number;
  };
  updated: {
    categories: number;
    products: number;
  };
  errors?: string[];
  changes?: MenuSyncChanges; // Cambios detectados (precios, inventario, etc.)
}

/**
 * Importar menú completo desde POS
 */
export async function importMenuFromPOS(
  restaurantId: string,
  posType: POSType,
  credentials: POSCredentials
): Promise<MenuSyncResult> {
  try {
    // Obtener restaurante
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        posEnabled: true,
        posType: true,
      },
    });

    if (!restaurant) {
      throw new Error('Restaurante no encontrado');
    }

    // Crear conector POS
    const connector = createPOSConnector(posType, credentials);

    // Obtener menú desde POS
    logger.info(
      { restaurantId, posType },
      'Iniciando importación de menú desde POS'
    );
    const posMenu = await connector.getMenu();

    // Normalizar y guardar menú
    const result = await syncMenuToDatabase(restaurantId, posMenu);

    // Guardar en historial
    await saveSyncHistory(restaurantId, result, result.changes || null);

    // Actualizar fecha de última sincronización en restaurante
    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        posLastTestAt: new Date(),
        posLastTestResult: {
          lastMenuSync: new Date().toISOString(),
          success: result.success,
        },
      },
    });

    logger.info(
      { restaurantId, result },
      'Importación de menú desde POS completada'
    );

    return result;
  } catch (error: any) {
    logger.error(
      { restaurantId, posType, error },
      'Error al importar menú desde POS'
    );
    return {
      success: false,
      message: `Error al importar menú: ${error.message}`,
      imported: { categories: 0, products: 0 },
      updated: { categories: 0, products: 0 },
      errors: [error.message],
    };
  }
}

/**
 * Sincronizar menú POS a base de datos
 * Preserva personalizaciones visuales (displayName, imágenes, orden, visibilidad)
 */
async function syncMenuToDatabase(
  restaurantId: string,
  posMenu: POSMenu
): Promise<MenuSyncResult> {
  const errors: string[] = [];
  let importedCategories = 0;
  let updatedCategories = 0;
  let importedProducts = 0;
  let updatedProducts = 0;

  // Inicializar cambios detectados
  const changes: MenuSyncChanges = {
    priceChanges: [],
    inventoryChanges: [],
    newProducts: [],
    deactivatedProducts: [],
  };

  // Mapa para rastrear categorías existentes por posCategoryId
  const existingCategories = new Map<string, string>(); // posCategoryId -> categoryId

  // 1. Sincronizar categorías
  for (const posCategory of posMenu.categories) {
    try {
      // Buscar categoría existente por posCategoryId
      const existing = await prisma.category.findFirst({
        where: {
          restaurantId,
          posCategoryId: posCategory.id,
        },
      });

      if (existing) {
        // Actualizar categoría existente (preservar displayName y personalizaciones)
        await prisma.category.update({
          where: { id: existing.id },
          data: {
            name: posCategory.name, // Actualizar nombre desde POS
            description: posCategory.description || existing.description,
            posLastSyncedAt: new Date(),
            menuSource: MenuSource.POS,
            // NO sobrescribir displayName si existe (personalización visual)
            // NO sobrescribir sort, isActive (personalización visual)
          },
        });
        existingCategories.set(posCategory.id, existing.id);
        updatedCategories++;
      } else {
        // Crear nueva categoría
        const newCategory = await prisma.category.create({
          data: {
            restaurantId,
            name: posCategory.name,
            description: posCategory.description,
            posCategoryId: posCategory.id,
            menuSource: MenuSource.POS,
            posLastSyncedAt: new Date(),
            sort: posCategory.sort || 0,
            isActive: posCategory.isActive !== false,
          },
        });
        existingCategories.set(posCategory.id, newCategory.id);
        importedCategories++;
      }
    } catch (error: any) {
      errors.push(
        `Error al sincronizar categoría ${posCategory.name}: ${error.message}`
      );
      logger.error(
        { restaurantId, posCategory, error },
        'Error al sincronizar categoría desde POS'
      );
    }
  }

  // 2. Sincronizar productos
  for (const posItem of posMenu.items) {
    try {
      // Buscar categoría YouPick para este producto
      const categoryId = existingCategories.get(posItem.categoryId);
      if (!categoryId) {
        errors.push(
          `Categoría POS ${posItem.categoryId} no encontrada para producto ${posItem.name}`
        );
        continue;
      }

      // Buscar producto existente por posItemId
      const existing = await prisma.product.findFirst({
        where: {
          restaurantId,
          posItemId: posItem.id,
        },
      });

      if (existing) {
        // Detectar cambios antes de actualizar
        const priceChanged =
          existing.posPrice !== null && existing.posPrice !== posItem.price;
        const inventoryChanged =
          existing.posInventoryQuantity !== (posItem.inventoryQuantity || null);
        const wasActive = existing.isActive;
        const isNowActive = posItem.isAvailable !== false;

        // Actualizar producto existente (preservar personalizaciones visuales)
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            name: posItem.name, // Actualizar nombre desde POS
            description: posItem.description || existing.description,
            price: posItem.price, // Actualizar precio desde POS
            posPrice: posItem.price, // Guardar precio POS para comparación
            posInventoryQuantity: posItem.inventoryQuantity || null,
            posLastSyncedAt: new Date(),
            menuSource: MenuSource.POS,
            categoryId, // Actualizar categoría si cambió
            isActive: isNowActive, // Actualizar estado desde POS
            // NO sobrescribir displayName si existe (personalización visual)
            // NO sobrescribir imageUrl, imagePosition, imageScale (personalización visual)
            // NO sobrescribir sort, isFeatured (personalización visual)
            // NO sobrescribir promotionPrice (puede ser personalizado)
          },
        });
        updatedProducts++;

        // Registrar cambios para notificaciones
        if (priceChanged) {
          changes.priceChanges.push({
            productId: existing.id,
            productName: existing.displayName || existing.name,
            oldPrice: existing.posPrice || existing.price,
            newPrice: posItem.price,
          });
        }

        if (inventoryChanged) {
          changes.inventoryChanges.push({
            productId: existing.id,
            productName: existing.displayName || existing.name,
            oldQuantity: existing.posInventoryQuantity,
            newQuantity: posItem.inventoryQuantity || null,
          });
        }

        if (wasActive && !isNowActive) {
          changes.deactivatedProducts.push({
            productId: existing.id,
            productName: existing.displayName || existing.name,
          });
        }
      } else {
        // Crear nuevo producto
        const newProduct = await prisma.product.create({
          data: {
            restaurantId,
            categoryId,
            name: posItem.name,
            description: posItem.description,
            price: posItem.price,
            posItemId: posItem.id, // CRÍTICO: guardar posItemId
            posPrice: posItem.price,
            posInventoryQuantity: posItem.inventoryQuantity || null,
            menuSource: MenuSource.POS,
            posLastSyncedAt: new Date(),
            isActive: posItem.isAvailable !== false,
            sort: 0, // Se puede personalizar después
          },
        });
        importedProducts++;

        // Registrar como nuevo producto
        changes.newProducts.push({
          productId: newProduct.id,
          productName: newProduct.name,
        });
      }
    } catch (error: any) {
      errors.push(
        `Error al sincronizar producto ${posItem.name}: ${error.message}`
      );
      logger.error(
        { restaurantId, posItem, error },
        'Error al sincronizar producto desde POS'
      );
    }
  }

  return {
    success: errors.length === 0,
    message:
      errors.length === 0
        ? `Menú sincronizado exitosamente: ${importedCategories + updatedCategories} categorías, ${importedProducts + updatedProducts} productos`
        : `Menú sincronizado con ${errors.length} errores`,
    imported: {
      categories: importedCategories,
      products: importedProducts,
    },
    updated: {
      categories: updatedCategories,
      products: updatedProducts,
    },
    errors: errors.length > 0 ? errors : undefined,
    changes, // Incluir cambios detectados
  };
}

/**
 * Re-sincronizar menú desde POS (sin perder personalizaciones)
 */
export async function resyncMenuFromPOS(
  restaurantId: string
): Promise<MenuSyncResult> {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        posEnabled: true,
        posType: true,
        posCredentials: true,
      },
    });

    if (!restaurant || !restaurant.posEnabled || !restaurant.posType) {
      throw new Error('Integración POS no habilitada para este restaurante');
    }

    const result = await importMenuFromPOS(
      restaurantId,
      restaurant.posType as POSType,
      restaurant.posCredentials as POSCredentials
    );

    // Si hay cambios, crear notificaciones
    if (result.changes && result.success) {
      await createChangeNotifications(restaurantId, result.changes);
    }

    return result;
  } catch (error: any) {
    logger.error(
      { restaurantId, error },
      'Error al re-sincronizar menú desde POS'
    );
    return {
      success: false,
      message: `Error al re-sincronizar menú: ${error.message}`,
      imported: { categories: 0, products: 0 },
      updated: { categories: 0, products: 0 },
      errors: [error.message],
    };
  }
}

/**
 * Guardar historial de sincronización
 */
async function saveSyncHistory(
  restaurantId: string,
  result: MenuSyncResult,
  changes: MenuSyncChanges | null
): Promise<void> {
  try {
    await prisma.menuSyncHistory.create({
      data: {
        restaurantId,
        syncedAt: new Date(),
        importedCategories: result.imported.categories,
        importedProducts: result.imported.products,
        updatedCategories: result.updated.categories,
        updatedProducts: result.updated.products,
        errors:
          result.errors && result.errors.length > 0
            ? result.errors
            : Prisma.JsonNull,
        changes: changes
          ? {
              priceChanges: changes.priceChanges,
              inventoryChanges: changes.inventoryChanges,
              newProducts: changes.newProducts,
              deactivatedProducts: changes.deactivatedProducts,
            }
          : Prisma.JsonNull,
      },
    });
  } catch (error) {
    logger.error(
      { restaurantId, error },
      'Error guardando historial de sincronización'
    );
    // No fallar la sincronización si falla el historial
  }
}

/**
 * Crear notificaciones de cambios detectados
 */
async function createChangeNotifications(
  restaurantId: string,
  changes: MenuSyncChanges
): Promise<void> {
  try {
    const notifications: Array<{
      type: NotificationType;
      title: string;
      message: string;
      userId?: string;
      metadata?: any;
    }> = [];

    // Notificar cambios de precio
    if (changes.priceChanges.length > 0) {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: {
          users: {
            where: { role: 'restaurant_admin' },
            select: { id: true },
          },
        },
      });

      if (restaurant && restaurant.users.length > 0) {
        for (const user of restaurant.users) {
          notifications.push({
            type: NotificationType.PRICE_CHANGE,
            title: 'Cambios de Precio en POS',
            message: `${changes.priceChanges.length} producto(s) tuvieron cambios de precio en el POS`,
            userId: user.id,
            metadata: {
              restaurantId,
              changes: changes.priceChanges,
            },
          });
        }
      }
    }

    // Notificar cambios de inventario
    if (changes.inventoryChanges.length > 0) {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: {
          users: {
            where: { role: 'restaurant_admin' },
            select: { id: true },
          },
        },
      });

      if (restaurant && restaurant.users.length > 0) {
        for (const user of restaurant.users) {
          notifications.push({
            type: NotificationType.INVENTORY_CHANGE,
            title: 'Cambios de Inventario en POS',
            message: `${changes.inventoryChanges.length} producto(s) tuvieron cambios de inventario en el POS`,
            userId: user.id,
            metadata: {
              restaurantId,
              changes: changes.inventoryChanges,
            },
          });
        }
      }
    }

    // Crear notificaciones
    if (notifications.length > 0) {
      await prisma.notification.createMany({
        data: notifications,
      });
    }
  } catch (error) {
    logger.error(
      { restaurantId, error },
      'Error creando notificaciones de cambios'
    );
    // No fallar la sincronización si fallan las notificaciones
  }
}

/**
 * Sincronizar menús de todos los restaurantes con POS habilitado
 * Para usar en cron jobs o tareas programadas
 */
export async function syncAllRestaurantMenus(): Promise<{
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    restaurantId: string;
    restaurantName: string;
    success: boolean;
    message: string;
  }>;
}> {
  const results: Array<{
    restaurantId: string;
    restaurantName: string;
    success: boolean;
    message: string;
  }> = [];

  try {
    const restaurants = await prisma.restaurant.findMany({
      where: {
        posEnabled: true,
        posType: { not: null },
        posCredentials: { not: Prisma.JsonNull },
      },
      select: {
        id: true,
        name: true,
        posType: true,
        posCredentials: true,
      },
    });

    logger.info(
      { count: restaurants.length },
      'Iniciando sincronización automática de menús'
    );

    for (const restaurant of restaurants) {
      try {
        const result = await resyncMenuFromPOS(restaurant.id);
        results.push({
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          success: result.success,
          message: result.message,
        });
      } catch (error: any) {
        logger.error(
          { restaurantId: restaurant.id, error },
          'Error en sincronización automática'
        );
        results.push({
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          success: false,
          message: `Error: ${error.message}`,
        });
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    logger.info(
      { total: restaurants.length, successful, failed },
      'Sincronización automática completada'
    );

    return {
      total: restaurants.length,
      successful,
      failed,
      results,
    };
  } catch (error) {
    logger.error({ error }, 'Error en sincronización automática global');
    throw error;
  }
}
