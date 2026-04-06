/**
 * Funciones de sincronización para MasterProduct -> BranchProduct
 * Cuando se crea/actualiza un MasterProduct, se deben sincronizar los BranchProducts
 */

import { prisma } from './db';
import logger from './logger';

/**
 * Sincroniza un MasterProduct a todos los restaurantes de su Central
 * Crea BranchProducts para restaurantes que no lo tengan
 * 
 * @param masterProductId ID del MasterProduct a sincronizar
 */
export async function syncMasterProductToBranches(
  masterProductId: string,
  txOverride?: any
): Promise<void> {
  try {
    // Obtener el MasterProduct con su Central
    const client = txOverride || prisma;

    const masterProduct = await (client as any).masterProduct.findUnique({
      where: { id: masterProductId },
      include: {
        central: {
          include: {
            restaurants: {
              where: { isActive: true },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!masterProduct) {
      throw new Error(`MasterProduct ${masterProductId} no encontrado`);
    }

    const restaurantIds = masterProduct.central.restaurants.map(
      (r: any) => r.id
    );

    if (restaurantIds.length === 0) {
      logger.info(
        { masterProductId, centralId: masterProduct.centralId },
        'No hay restaurantes activos para sincronizar'
      );
      return;
    }

    // Crear BranchProducts para restaurantes que no lo tengan
    const branchProductsData = restaurantIds.map((restaurantId: string) => ({
      restaurantId,
      masterProductId,
      localPrice: null, // Usar precio base del master
      localPromotionPrice: null,
      localIsFeatured: null,
      localPrepMinutes: null,
      localSpecs: null,
      isLocallyActive: masterProduct.isGloballyAvailable, // Sincronizar disponibilidad global
    }));

    await (client as any).branchProduct.createMany({
      data: branchProductsData,
      skipDuplicates: true, // No crear si ya existe
    });

    logger.info(
      {
        masterProductId,
        centralId: masterProduct.centralId,
        restaurantsSynced: restaurantIds.length,
      },
      'MasterProduct sincronizado a restaurantes'
    );
  } catch (error) {
    logger.error(
      { error, masterProductId },
      'Error sincronizando MasterProduct a restaurantes'
    );
    throw error;
  }
}

/**
 * Sincroniza todos los MasterProducts de una Central a un nuevo restaurante
 * Útil cuando se agrega un nuevo restaurante a una Central existente
 * 
 * @param centralId ID de la Central
 * @param restaurantId ID del restaurante nuevo
 */
export async function syncCentralProductsToRestaurant(
  centralId: string,
  restaurantId: string
): Promise<void> {
  try {
    // Obtener todos los MasterProducts de la Central
    const masterProducts = await (prisma as any).masterProduct.findMany({
      where: {
        centralId,
      },
      select: {
        id: true,
        isGloballyAvailable: true,
      },
    });

    if (masterProducts.length === 0) {
      logger.info(
        { centralId, restaurantId },
        'No hay MasterProducts para sincronizar'
      );
      return;
    }

    // Crear BranchProducts para cada MasterProduct
    const branchProductsData = masterProducts.map((mp: any) => ({
      restaurantId,
      masterProductId: mp.id,
      localPrice: null,
      isLocallyActive: mp.isGloballyAvailable,
    }));

    await (prisma as any).branchProduct.createMany({
      data: branchProductsData,
      skipDuplicates: true,
    });

    logger.info(
      {
        centralId,
        restaurantId,
        productsSynced: masterProducts.length,
      },
      'Productos de Central sincronizados a restaurante'
    );
  } catch (error) {
    logger.error(
      { error, centralId, restaurantId },
      'Error sincronizando productos de Central a restaurante'
    );
    throw error;
  }
}

/**
 * Actualiza la disponibilidad global de un MasterProduct (Panic Button)
 * Si isGloballyAvailable = false, se oculta en TODAS las tiendas
 * 
 * @param masterProductId ID del MasterProduct
 * @param isGloballyAvailable Nuevo estado del panic button
 */
export async function updateGlobalAvailability(
  masterProductId: string,
  isGloballyAvailable: boolean
): Promise<void> {
  try {
    // Actualizar el MasterProduct
    await (prisma as any).masterProduct.update({
      where: { id: masterProductId },
      data: { isGloballyAvailable },
    });

    // Opcional: También actualizar isLocallyActive en BranchProducts para mantener consistencia
    // (aunque la lógica de disponibilidad solo requiere isGloballyAvailable = true)
    // Esto es útil si queremos que cuando se reactive, también se reactive localmente
    if (isGloballyAvailable) {
      // Si se reactiva globalmente, no cambiamos isLocallyActive (cada tienda decide)
      // Pero si se desactiva, podríamos querer desactivar localmente también
    }

    logger.info(
      {
        masterProductId,
        isGloballyAvailable,
      },
      'Disponibilidad global actualizada (Panic Button)'
    );
  } catch (error) {
    logger.error(
      { error, masterProductId, isGloballyAvailable },
      'Error actualizando disponibilidad global'
    );
    throw error;
  }
}

/**
 * Sincroniza las opciones maestras (MasterOptionGroup y MasterOption) a productos locales
 * Crea/actualiza ProductOptionGroup y ProductOption para cada Product que corresponda
 * a un BranchProduct del MasterProduct
 * 
 * @param masterProductId ID del MasterProduct
 * @param txOverride Transacción opcional para operaciones atómicas
 */
export async function syncMasterOptionsToLocalProducts(
  masterProductId: string,
  txOverride?: any
): Promise<void> {
  try {
    const client = txOverride || prisma;

    // Obtener el MasterProduct con sus opciones
    const masterProduct = await (client as any).masterProduct.findUnique({
      where: { id: masterProductId },
      include: {
        masterOptionGroups: {
          include: {
            masterOptions: {
              orderBy: { sort: 'asc' },
            },
          },
          orderBy: { sort: 'asc' },
        },
        central: {
          include: {
            restaurants: {
              where: { isActive: true },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!masterProduct) {
      throw new Error(`MasterProduct ${masterProductId} no encontrado`);
    }

    const restaurantIds = masterProduct.central.restaurants.map(
      (r: any) => r.id
    );

    if (restaurantIds.length === 0) {
      logger.info(
        { masterProductId },
        'No hay restaurantes activos para sincronizar opciones'
      );
      return;
    }

    // Para cada restaurante, buscar o crear el Product correspondiente
    // y sincronizar las opciones
    for (const restaurantId of restaurantIds) {
      // Buscar Product por restaurantId y nombre del MasterProduct
      // (asumimos que el Product tiene el mismo nombre que el MasterProduct)
      let localProduct = await (client as any).product.findFirst({
        where: {
          restaurantId,
          name: masterProduct.name,
        },
        include: {
          optionGroups: {
            include: {
              options: true,
            },
          },
        },
      });

      // Si no existe el Product, crearlo
      // Necesitamos una categoría del restaurante, usar la primera disponible
      if (!localProduct) {
        const category = await (client as any).category.findFirst({
          where: {
            restaurantId,
            isActive: true,
          },
          orderBy: { sort: 'asc' },
        });

        if (!category) {
          logger.warn(
            { restaurantId, masterProductId },
            'No hay categorías disponibles para crear Product local'
          );
          continue;
        }

        localProduct = await (client as any).product.create({
          data: {
            restaurantId,
            categoryId: category.id,
            name: masterProduct.name,
            description: masterProduct.description,
            price: masterProduct.basePrice,
            promotionPrice: masterProduct.promotionPrice,
            imageUrl: masterProduct.imageUrl,
            imagePosition: masterProduct.imagePosition,
            imageScale: masterProduct.imageScale,
            prepMinutes: masterProduct.prepMinutes,
            isFeatured: masterProduct.isFeatured,
            isActive: masterProduct.isGloballyAvailable,
            sort: masterProduct.sort || 0,
          },
        });
      }

      // Sincronizar MasterOptionGroups a ProductOptionGroups
      for (const masterGroup of masterProduct.masterOptionGroups) {
        // Buscar o crear ProductOptionGroup
        let localGroup = await (client as any).productOptionGroup.findFirst({
          where: {
            productId: localProduct.id,
            name: masterGroup.name,
          },
        });

        if (!localGroup) {
          localGroup = await (client as any).productOptionGroup.create({
            data: {
              productId: localProduct.id,
              name: masterGroup.name,
              min: masterGroup.min,
              max: masterGroup.max,
              required: masterGroup.required,
              sort: masterGroup.sort,
            },
          });
        } else {
          // Actualizar el grupo existente
          await (client as any).productOptionGroup.update({
            where: { id: localGroup.id },
            data: {
              min: masterGroup.min,
              max: masterGroup.max,
              required: masterGroup.required,
              sort: masterGroup.sort,
            },
          });
        }

        // Sincronizar MasterOptions a ProductOptions
        for (const masterOption of masterGroup.masterOptions) {
          // Buscar o crear ProductOption
          let localOption = await (client as any).productOption.findFirst({
            where: {
              groupId: localGroup.id,
              name: masterOption.name,
            },
          });

          if (!localOption) {
            await (client as any).productOption.create({
              data: {
                groupId: localGroup.id,
                name: masterOption.name,
                priceDelta: masterOption.priceDelta,
                isDefault: masterOption.isDefault,
                sort: masterOption.sort,
                isActive: masterOption.isActive ?? true,
              },
            });
          } else {
            // Actualizar la opción existente
            await (client as any).productOption.update({
              where: { id: localOption.id },
              data: {
                priceDelta: masterOption.priceDelta,
                isDefault: masterOption.isDefault,
                sort: masterOption.sort,
                isActive: masterOption.isActive ?? true,
              },
            });
          }
        }

        // Eliminar opciones locales que ya no existen en el master
        const masterOptionNames = masterGroup.masterOptions.map(
          (mo: any) => mo.name
        );
        await (client as any).productOption.deleteMany({
          where: {
            groupId: localGroup.id,
            name: {
              notIn: masterOptionNames,
            },
          },
        });
      }

      // Eliminar grupos locales que ya no existen en el master
      const masterGroupNames = masterProduct.masterOptionGroups.map(
        (mg: any) => mg.name
      );
      const groupsToDelete = await (client as any).productOptionGroup.findMany({
        where: {
          productId: localProduct.id,
          name: {
            notIn: masterGroupNames,
          },
        },
      });

      for (const groupToDelete of groupsToDelete) {
        await (client as any).productOptionGroup.delete({
          where: { id: groupToDelete.id },
        });
      }
    }

    logger.info(
      {
        masterProductId,
        restaurantsSynced: restaurantIds.length,
        optionGroupsSynced: masterProduct.masterOptionGroups.length,
      },
      'Opciones maestras sincronizadas a productos locales'
    );
  } catch (error) {
    logger.error(
      { error, masterProductId },
      'Error sincronizando opciones maestras a productos locales'
    );
    throw error;
  }
}

/**
 * Sincroniza BranchProducts a Products locales para restaurantes seleccionados
 * Respeta los productos locales que fueron creados/modificados por el admin del restaurante
 * 
 * @param centralId ID de la Central
 * @param restaurantIds Array de IDs de restaurantes a sincronizar (si está vacío, sincroniza todos)
 * @param txOverride Transacción opcional para operaciones atómicas
 */
export async function syncBranchProductsToLocalProducts(
  centralId: string,
  restaurantIds: string[] = [],
  txOverride?: any
): Promise<{ synced: number; skipped: number; errors: number }> {
  const client = txOverride || prisma;
  let synced = 0;
  let skipped = 0;
  let errors = 0;

  try {
    // Obtener restaurantes a sincronizar
    const whereClause: any = {
      centralId,
      isActive: true,
    };
    
    if (restaurantIds.length > 0) {
      whereClause.id = { in: restaurantIds };
    }

    const restaurants = await (client as any).restaurant.findMany({
      where: whereClause,
      select: { id: true },
    });

    if (restaurants.length === 0) {
      logger.info({ centralId, restaurantIds }, 'No hay restaurantes para sincronizar');
      return { synced: 0, skipped: 0, errors: 0 };
    }

    // Obtener todos los MasterProducts de la Central
    const masterProducts = await (client as any).masterProduct.findMany({
      where: { centralId },
      include: {
        masterCategory: true,
        masterOptionGroups: {
          include: {
            masterOptions: true,
          },
          orderBy: { sort: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Para cada restaurante
    for (const restaurant of restaurants) {
      const restaurantId = restaurant.id;

      try {
        // Obtener todos los BranchProducts del restaurante
        const branchProducts = await (client as any).branchProduct.findMany({
          where: { restaurantId },
          include: {
            masterProduct: {
              include: {
                masterCategory: true,
                masterOptionGroups: {
                  include: {
                    masterOptions: true,
                  },
                  orderBy: { sort: 'asc' },
                },
              },
            },
          },
        });

        // Obtener todos los Products locales del restaurante
        const localProducts = await (client as any).product.findMany({
          where: { restaurantId },
          include: {
            category: true,
          },
        });

        // Crear un mapa de productos locales por nombre (para identificar productos locales)
        const localProductsByName = new Map<string, any>();
        localProducts.forEach((p: any) => {
          localProductsByName.set(p.name.toLowerCase().trim(), p);
        });

        // Crear un mapa de BranchProducts por nombre del MasterProduct
        const branchProductsByMasterName = new Map<string, any>();
        branchProducts.forEach((bp: any) => {
          const name = bp.masterProduct.name.toLowerCase().trim();
          branchProductsByMasterName.set(name, bp);
        });

        // Para cada BranchProduct, crear o actualizar el Product local
        for (const bp of branchProducts) {
          const masterProduct = bp.masterProduct;
          const productName = masterProduct.name.toLowerCase().trim();
          
          // Verificar si existe un Product local con el mismo nombre
          const existingLocalProduct = localProductsByName.get(productName);

          // Si existe un Product local con el mismo nombre, verificar si fue creado localmente
          // Un Product local se considera "creado localmente" si NO tiene un BranchProduct asociado
          if (existingLocalProduct) {
            // Verificar si este Product local está vinculado a un BranchProduct
            const linkedBranchProduct = branchProductsByMasterName.get(productName);

            // Si NO está vinculado a un BranchProduct (no hay BranchProduct con ese nombre),
            // es un producto local creado por el admin. Lo respetamos y no lo tocamos.
            if (!linkedBranchProduct) {
              skipped++;
              logger.info(
                { restaurantId, productName, productId: existingLocalProduct.id },
                'Producto local respetado (no sincronizado)'
              );
              continue;
            }

            // Si el Product local está vinculado a un BranchProduct diferente (mismo nombre pero diferente master),
            // también lo respetamos (prioridad al producto local)
            if (linkedBranchProduct.masterProductId !== masterProduct.id) {
              skipped++;
              logger.info(
                { restaurantId, productName, productId: existingLocalProduct.id },
                'Producto local con mismo nombre pero diferente master respetado'
              );
              continue;
            }
          }

          // Obtener o crear categoría local
          let category = await (client as any).category.findFirst({
            where: {
              restaurantId,
              name: masterProduct.categoryName || masterProduct.masterCategory?.name || 'General',
            },
          });

          if (!category) {
            // Crear categoría si no existe
            category = await (client as any).category.create({
              data: {
                restaurantId,
                name: masterProduct.categoryName || masterProduct.masterCategory?.name || 'General',
                sort: masterProduct.categorySort || masterProduct.masterCategory?.sort || 0,
                isActive: true,
              },
            });
          }

          // Calcular precio final (localPrice si existe, sino basePrice)
          const finalPrice = bp.localPrice ?? masterProduct.basePrice;
          const finalPromotionPrice = bp.localPromotionPrice ?? masterProduct.promotionPrice;
          const finalIsFeatured = bp.localIsFeatured ?? masterProduct.isFeatured;
          const finalPrepMinutes = bp.localPrepMinutes ?? masterProduct.prepMinutes;
          const finalSpecs = bp.localSpecs ?? masterProduct.specs;
          const finalIsActive = masterProduct.isGloballyAvailable && bp.isLocallyActive;

          if (existingLocalProduct) {
            // Actualizar Product existente (solo si está vinculado al mismo BranchProduct)
            await (client as any).product.update({
              where: { id: existingLocalProduct.id },
              data: {
                name: masterProduct.name,
                description: masterProduct.description,
                price: finalPrice,
                promotionPrice: finalPromotionPrice,
                imageUrl: masterProduct.imageUrl,
                imagePosition: masterProduct.imagePosition,
                imageScale: masterProduct.imageScale,
                prepMinutes: finalPrepMinutes,
                isFeatured: finalIsFeatured,
                isActive: finalIsActive,
                categoryId: category.id,
                sort: masterProduct.categorySort || masterProduct.masterCategory?.sort || 0,
              },
            });

            // Sincronizar opciones
            await syncMasterOptionsToLocalProductsForProduct(
              masterProduct.id,
              existingLocalProduct.id,
              client
            );

            synced++;
          } else {
            // Crear nuevo Product
            const newProduct = await (client as any).product.create({
              data: {
                restaurantId,
                categoryId: category.id,
                name: masterProduct.name,
                description: masterProduct.description,
                price: finalPrice,
                promotionPrice: finalPromotionPrice,
                imageUrl: masterProduct.imageUrl,
                imagePosition: masterProduct.imagePosition,
                imageScale: masterProduct.imageScale,
                prepMinutes: finalPrepMinutes,
                isFeatured: finalIsFeatured,
                isActive: finalIsActive,
                sort: masterProduct.categorySort || masterProduct.masterCategory?.sort || 0,
              },
            });

            // Sincronizar opciones
            await syncMasterOptionsToLocalProductsForProduct(
              masterProduct.id,
              newProduct.id,
              client
            );

            synced++;
          }
        }
      } catch (error) {
        errors++;
        logger.error(
          { error, restaurantId: restaurant.id },
          'Error sincronizando productos del restaurante'
        );
      }
    }

    logger.info(
      {
        centralId,
        restaurantsProcessed: restaurants.length,
        synced,
        skipped,
        errors,
      },
      'Sincronización de BranchProducts a Products completada'
    );

    return { synced, skipped, errors };
  } catch (error) {
    logger.error({ error, centralId }, 'Error en sincronización de BranchProducts a Products');
    throw error;
  }
}

/**
 * Sincroniza opciones maestras a un Product local específico
 */
async function syncMasterOptionsToLocalProductsForProduct(
  masterProductId: string,
  productId: string,
  client: any
): Promise<void> {
  const masterProduct = await (client as any).masterProduct.findUnique({
    where: { id: masterProductId },
    include: {
      masterOptionGroups: {
        include: {
          masterOptions: {
            orderBy: { sort: 'asc' },
          },
        },
        orderBy: { sort: 'asc' },
      },
    },
  });

  if (!masterProduct) return;

  // Sincronizar grupos de opciones
  for (const masterGroup of masterProduct.masterOptionGroups) {
    let localGroup = await (client as any).productOptionGroup.findFirst({
      where: {
        productId,
        name: masterGroup.name,
      },
    });

    if (!localGroup) {
      localGroup = await (client as any).productOptionGroup.create({
        data: {
          productId,
          name: masterGroup.name,
          min: masterGroup.min,
          max: masterGroup.max,
          required: masterGroup.required,
          sort: masterGroup.sort,
        },
      });
    } else {
      await (client as any).productOptionGroup.update({
        where: { id: localGroup.id },
        data: {
          min: masterGroup.min,
          max: masterGroup.max,
          required: masterGroup.required,
          sort: masterGroup.sort,
        },
      });
    }

    // Sincronizar opciones
    for (const masterOption of masterGroup.masterOptions) {
      let localOption = await (client as any).productOption.findFirst({
        where: {
          groupId: localGroup.id,
          name: masterOption.name,
        },
      });

      if (!localOption) {
        await (client as any).productOption.create({
          data: {
            groupId: localGroup.id,
            name: masterOption.name,
            priceDelta: masterOption.priceDelta,
            isDefault: masterOption.isDefault,
            sort: masterOption.sort,
            isActive: masterOption.isActive ?? true,
          },
        });
      } else {
        await (client as any).productOption.update({
          where: { id: localOption.id },
          data: {
            priceDelta: masterOption.priceDelta,
            isDefault: masterOption.isDefault,
            sort: masterOption.sort,
            isActive: masterOption.isActive ?? true,
          },
        });
      }
    }

    // Eliminar opciones que ya no existen en el master
    const masterOptionNames = masterGroup.masterOptions.map((mo: any) => mo.name);
    await (client as any).productOption.deleteMany({
      where: {
        groupId: localGroup.id,
        name: {
          notIn: masterOptionNames,
        },
      },
    });
  }

  // Eliminar grupos que ya no existen en el master
  const masterGroupNames = masterProduct.masterOptionGroups.map((mg: any) => mg.name);
  await (client as any).productOptionGroup.deleteMany({
    where: {
      productId,
      name: {
        notIn: masterGroupNames,
      },
    },
  });
}

