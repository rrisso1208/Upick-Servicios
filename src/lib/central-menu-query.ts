/**
 * Query optimizada para obtener el menú jerárquico de un restaurante
 * Implementa la lógica de precios y disponibilidad según la tabla de verdad:
 * 
 * Precio: COALESCE(branch_product.local_price, master_product.base_price)
 * Disponibilidad: master_product.is_globally_available = TRUE AND branch_product.is_locally_active = TRUE
 */

import { prisma } from './db';

export interface MenuProduct {
  id: string;
  masterProductId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  imagePosition: string;
  imageScale: number;
  sku: string | null;
  // Categoría y horarios
  categoryName: string | null;
  categorySort: number;
  saleHoursStart: string | null;
  saleHoursEnd: string | null;
  // Precios
  price: number; // Precio final calculado (local_price o base_price)
  basePrice: number; // Precio base del master
  localPrice: number | null; // Override local
  promotionPrice: number | null; // Precio promo final (local o global)
  globalPromotionPrice: number | null;
  localPromotionPrice: number | null;
  // Destacado y preparación
  isFeatured: boolean; // Flag final (local o global)
  globalIsFeatured: boolean;
  localIsFeatured: boolean | null;
  prepMinutes: number; // Tiempo final (local o global)
  globalPrepMinutes: number;
  localPrepMinutes: number | null;
  // Especificaciones
  specs: any | null; // JSON final (local o global)
  globalSpecs: any | null;
  localSpecs: any | null;
  // Disponibilidad / Panic button
  isAvailable: boolean; // Resultado de la lógica de disponibilidad
  isGloballyAvailable: boolean; // Estado del panic button
  isLocallyActive: boolean; // Estado local
}

/**
 * Obtiene el menú completo de un restaurante con la lógica jerárquica
 * Incluye opciones maestras (MasterOptionGroup y MasterOption)
 * 
 * @param restaurantId ID del restaurante
 * @returns Array de productos con precios, disponibilidad y opciones calculados
 */
export async function getRestaurantMenu(restaurantId: string): Promise<MenuProduct[]> {
  // Query SQL optimizada con JOINs y lógica de negocio
  const products = await prisma.$queryRaw<MenuProduct[]>`
    SELECT
      bp.id,
      mp.id as "masterProductId",
      mp.name,
      mp.description,
      mp."imageUrl",
      mp."imagePosition",
      mp."imageScale",
      mp.sku,
      -- Categoría y horarios (solo globales, no hay overrides locales)
      COALESCE(mc.name, mp."categoryName") as "categoryName",
      COALESCE(mc.sort, mp."categorySort") as "categorySort",
      COALESCE(mc."saleHoursStart", mp."saleHoursStart") as "saleHoursStart",
      COALESCE(mc."saleHoursEnd", mp."saleHoursEnd") as "saleHoursEnd",
      -- Lógica de precio: local_price si existe, sino base_price
      COALESCE(bp."localPrice", mp."basePrice") as price,
      mp."basePrice" as "basePrice",
      bp."localPrice" as "localPrice",
      -- Lógica de precio promocional (puede ser NULL)
      COALESCE(bp."localPromotionPrice", mp."promotionPrice") as "promotionPrice",
      mp."promotionPrice" as "globalPromotionPrice",
      bp."localPromotionPrice" as "localPromotionPrice",
      -- Destacado (featured)
      COALESCE(bp."localIsFeatured", mp."isFeatured") as "isFeatured",
      mp."isFeatured" as "globalIsFeatured",
      bp."localIsFeatured" as "localIsFeatured",
      -- Tiempo de preparación
      COALESCE(bp."localPrepMinutes", mp."prepMinutes") as "prepMinutes",
      mp."prepMinutes" as "globalPrepMinutes",
      bp."localPrepMinutes" as "localPrepMinutes",
      -- Especificaciones (JSON)
      COALESCE(bp."localSpecs", mp.specs) as specs,
      mp.specs as "globalSpecs",
      bp."localSpecs" as "localSpecs",
      -- Lógica de disponibilidad: ambas condiciones deben ser TRUE
      (mp."isGloballyAvailable" = true AND bp."isLocallyActive" = true) as "isAvailable",
      mp."isGloballyAvailable" as "isGloballyAvailable",
      bp."isLocallyActive" as "isLocallyActive"
    FROM "BranchProduct" bp
    INNER JOIN "MasterProduct" mp ON bp."masterProductId" = mp.id
    LEFT JOIN "MasterCategory" mc ON mp."masterCategoryId" = mc.id
    WHERE bp."restaurantId" = ${restaurantId}
      -- Solo productos disponibles según la regla del pánico
      AND mp."isGloballyAvailable" = true
      AND bp."isLocallyActive" = true
    ORDER BY mp.name ASC
  `;

  // Obtener opciones maestras para cada producto
  // Como las opciones están en MasterProduct, las obtenemos por separado
  const productsWithOptions = await Promise.all(
    products.map(async (product) => {
      const optionGroups = await (prisma as any).masterOptionGroup.findMany({
        where: {
          masterProductId: product.masterProductId,
        },
        include: {
          masterOptions: {
            where: {
              isActive: true,
            },
            orderBy: {
              sort: 'asc',
            },
          },
        },
        orderBy: {
          sort: 'asc',
        },
      });

      return {
        ...product,
        optionGroups: optionGroups.map((og: any) => ({
          id: og.id,
          name: og.name,
          min: og.min,
          max: og.max,
          required: og.required,
          sort: og.sort,
          options: og.masterOptions.map((mo: any) => ({
            id: mo.id,
            name: mo.name,
            priceDelta: mo.priceDelta,
            isDefault: mo.isDefault,
            sort: mo.sort,
            isActive: mo.isActive,
          })),
        })),
      };
    })
  );

  return productsWithOptions as any;
}

/**
 * Obtiene el menú completo incluyendo productos no disponibles (para admin)
 * Útil para el panel de administración donde se necesita ver todo
 * Incluye opciones maestras
 */
export async function getRestaurantMenuForAdmin(restaurantId: string): Promise<MenuProduct[]> {
  const products = await prisma.$queryRaw<MenuProduct[]>`
    SELECT
      bp.id,
      mp.id as "masterProductId",
      mp.name,
      mp.description,
      mp."imageUrl",
      mp."imagePosition",
      mp."imageScale",
      mp.sku,
      COALESCE(mc.name, mp."categoryName") as "categoryName",
      COALESCE(mc.sort, mp."categorySort") as "categorySort",
      COALESCE(mc."saleHoursStart", mp."saleHoursStart") as "saleHoursStart",
      COALESCE(mc."saleHoursEnd", mp."saleHoursEnd") as "saleHoursEnd",
      COALESCE(bp."localPrice", mp."basePrice") as price,
      mp."basePrice" as "basePrice",
      bp."localPrice" as "localPrice",
      COALESCE(bp."localPromotionPrice", mp."promotionPrice") as "promotionPrice",
      mp."promotionPrice" as "globalPromotionPrice",
      bp."localPromotionPrice" as "localPromotionPrice",
      COALESCE(bp."localIsFeatured", mp."isFeatured") as "isFeatured",
      mp."isFeatured" as "globalIsFeatured",
      bp."localIsFeatured" as "localIsFeatured",
      COALESCE(bp."localPrepMinutes", mp."prepMinutes") as "prepMinutes",
      mp."prepMinutes" as "globalPrepMinutes",
      bp."localPrepMinutes" as "localPrepMinutes",
      COALESCE(bp."localSpecs", mp.specs) as specs,
      mp.specs as "globalSpecs",
      bp."localSpecs" as "localSpecs",
      (mp."isGloballyAvailable" = true AND bp."isLocallyActive" = true) as "isAvailable",
      mp."isGloballyAvailable" as "isGloballyAvailable",
      bp."isLocallyActive" as "isLocallyActive"
    FROM "BranchProduct" bp
    INNER JOIN "MasterProduct" mp ON bp."masterProductId" = mp.id
    LEFT JOIN "MasterCategory" mc ON mp."masterCategoryId" = mc.id
    WHERE bp."restaurantId" = ${restaurantId}
    ORDER BY mp.name ASC
  `;

  // Obtener opciones maestras para cada producto
  const productsWithOptions = await Promise.all(
    products.map(async (product) => {
      const optionGroups = await (prisma as any).masterOptionGroup.findMany({
        where: {
          masterProductId: product.masterProductId,
        },
        include: {
          masterOptions: {
            where: {
              isActive: true,
            },
            orderBy: {
              sort: 'asc',
            },
          },
        },
        orderBy: {
          sort: 'asc',
        },
      });

      return {
        ...product,
        optionGroups: optionGroups.map((og: any) => ({
          id: og.id,
          name: og.name,
          min: og.min,
          max: og.max,
          required: og.required,
          sort: og.sort,
          options: og.masterOptions.map((mo: any) => ({
            id: mo.id,
            name: mo.name,
            priceDelta: mo.priceDelta,
            isDefault: mo.isDefault,
            sort: mo.sort,
            isActive: mo.isActive,
          })),
        })),
      };
    })
  );

  return productsWithOptions as any;
}

