/**
 * Estrategia de Actualización Masiva
 * Permite actualizar precios, comisiones y fees en toda una Central
 */

import { prisma } from './db';
import logger from './logger';

/**
 * Actualiza el precio base de un MasterProduct y opcionalmente propaga a BranchProducts
 * 
 * @param masterProductId ID del MasterProduct
 * @param newBasePrice Nuevo precio base (en centavos)
 * @param updateBranches Si true, actualiza localPrice en BranchProducts que no tienen override
 */
export async function updateMasterProductPrice(
  masterProductId: string,
  newBasePrice: number,
  updateBranches: boolean = false
): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar precio base del MasterProduct
      await (tx as any).masterProduct.update({
        where: { id: masterProductId },
        data: { basePrice: newBasePrice },
      });

      // 2. Si se solicita, actualizar BranchProducts que no tienen localPrice
      if (updateBranches) {
        // Esto no es necesario porque la lógica de precio usa COALESCE
        // Pero podríamos querer establecer localPrice explícitamente para mantener historial
        // Por ahora, dejamos que COALESCE maneje la lógica
        logger.info(
          { masterProductId, newBasePrice },
          'Precio base actualizado. BranchProducts usarán el nuevo precio automáticamente (COALESCE)'
        );
      }
    });

    logger.info(
      { masterProductId, newBasePrice },
      'Precio de MasterProduct actualizado'
    );
  } catch (error) {
    logger.error(
      { error, masterProductId, newBasePrice },
      'Error actualizando precio de MasterProduct'
    );
    throw error;
  }
}

/**
 * Actualiza los valores financieros de una Central y propaga a todos sus restaurantes
 * 
 * @param centralId ID de la Central
 * @param commissionPercentage Nuevo % de comisión
 * @param freeFeeThreshold Nuevo umbral para fee gratis (centavos)
 * @param lowOrderFee Nuevo costo del fee (centavos)
 */
export async function updateCentralFinancials(
  centralId: string,
  commissionPercentage: number,
  freeFeeThreshold: number,
  lowOrderFee: number
): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar Central
      await (tx as any).central.update({
        where: { id: centralId },
        data: {
          commissionPercentage,
          freeFeeThreshold,
          lowOrderFee,
        },
      });

      // 2. Actualizar todos los restaurantes de la Central
      const updateCount = await (tx as any).restaurant.updateMany({
        where: {
          centralId,
          isActive: true,
        },
        data: {
          commissionPercentage,
          freeFeeThreshold,
          lowOrderFee,
        },
      });

      logger.info(
        {
          centralId,
          commissionPercentage,
          freeFeeThreshold,
          lowOrderFee,
          restaurantsUpdated: updateCount.count,
        },
        'Valores financieros de Central actualizados y propagados'
      );
    });
  } catch (error) {
    logger.error(
      { error, centralId, commissionPercentage, freeFeeThreshold, lowOrderFee },
      'Error actualizando valores financieros de Central'
    );
    throw error;
  }
}

/**
 * Actualiza masivamente el precio de múltiples MasterProducts
 * Útil para cambios de precios masivos en toda la Central
 * 
 * @param centralId ID de la Central
 * @param priceUpdates Array de { masterProductId, newBasePrice }
 */
export async function bulkUpdateMasterProductPrices(
  centralId: string,
  priceUpdates: Array<{ masterProductId: string; newBasePrice: number }>
): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      // Actualizar cada MasterProduct
      for (const update of priceUpdates) {
        await (tx as any).masterProduct.update({
          where: {
            id: update.masterProductId,
            centralId, // Validar que pertenece a la Central
          },
          data: {
            basePrice: update.newBasePrice,
          },
        });
      }
    });

    logger.info(
      {
        centralId,
        productsUpdated: priceUpdates.length,
      },
      'Precios de MasterProducts actualizados masivamente'
    );
  } catch (error) {
    logger.error(
      { error, centralId, priceUpdates },
      'Error en actualización masiva de precios'
    );
    throw error;
  }
}

/**
 * Propaga el logo y banner de una Central a todos sus restaurantes asociados
 * 
 * @param centralId ID de la Central
 * @param logoUrl URL del logo (puede ser null para remover, undefined para no actualizar)
 * @param bannerUrl URL del banner (puede ser null para remover, undefined para no actualizar)
 */
export async function propagateCentralImages(
  centralId: string,
  logoUrl: string | null | undefined,
  bannerUrl?: string | null | undefined
): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      const updateData: any = {};
      
      // Solo actualizar si logoUrl está definido (no undefined)
      if (logoUrl !== undefined) {
        updateData.imageUrl = logoUrl; // En Restaurant, imageUrl es el logo
      }
      
      // Solo actualizar si bannerUrl está definido (no undefined)
      if (bannerUrl !== undefined) {
        updateData.bannerUrl = bannerUrl;
      }
      
      // Si no hay nada que actualizar, salir
      if (Object.keys(updateData).length === 0) {
        return;
      }

      const updateCount = await (tx as any).restaurant.updateMany({
        where: {
          centralId,
          isActive: true,
        },
        data: updateData,
      });

      logger.info(
        {
          centralId,
          logoUrl,
          bannerUrl,
          restaurantsUpdated: updateCount.count,
        },
        'Logo y banner de Central propagados a restaurantes'
      );
    });
  } catch (error) {
    logger.error(
      { error, centralId, logoUrl, bannerUrl },
      'Error propagando imágenes de Central'
    );
    throw error;
  }
}

