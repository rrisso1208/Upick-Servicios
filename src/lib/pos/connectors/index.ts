/**
 * Exportar todos los conectores POS
 */

import { VendtyConnector } from './vendty';
import { SiigoConnector } from './siigo';
import { SoftRestaurantConnector } from './softrestaurant';
import { LoggroConnector } from './loggro';
import { LoyverseConnector } from './loyverse';
import { ToteatConnector } from './toteat';
import { RestaurantePOSConnector } from './restaurantepos';
import { BasePOSConnector } from './base';
import { POSType, POSCredentials } from '../types';

/**
 * Factory para crear instancias de conectores según el tipo
 */
export function createPOSConnector(
  posType: POSType,
  credentials: POSCredentials
): BasePOSConnector {
  switch (posType) {
    case 'vendty':
      return new VendtyConnector(credentials);
    case 'siigo':
      return new SiigoConnector(credentials);
    case 'softrestaurant':
      return new SoftRestaurantConnector(credentials);
    case 'loggro':
      return new LoggroConnector(credentials);
    case 'loyverse':
      return new LoyverseConnector(credentials);
    case 'toteat':
      return new ToteatConnector(credentials);
    case 'restaurantepos':
      return new RestaurantePOSConnector(credentials);
    default:
      throw new Error(`Tipo de POS no soportado: ${posType}`);
  }
}

/**
 * Lista de tipos de POS disponibles
 */
/**
 * Lista de tipos de POS disponibles (priorizados para Colombia)
 */
export const AVAILABLE_POS_TYPES: Array<{
  value: POSType;
  label: string;
  description: string;
}> = [
  {
    value: 'vendty',
    label: 'Vendty POS',
    description:
      'Sistema POS muy popular en restaurantes y gastrobares colombianos',
  },
  {
    value: 'siigo',
    label: 'Siigo POS',
    description:
      'Sistema de facturación y POS con integración DIAN para restaurantes',
  },
  {
    value: 'softrestaurant',
    label: 'SoftRestaurant',
    description: 'Sistema de gestión integral para restaurantes en Colombia',
  },
  {
    value: 'loggro',
    label: 'Loggro POS Restobar',
    description: 'Sistema POS especializado para restaurantes y bares',
  },
  {
    value: 'loyverse',
    label: 'Loyverse POS',
    description:
      'Sistema POS gratuito popular en restaurantes pequeños y medianos',
  },
  {
    value: 'toteat',
    label: 'Toteat / Fudo POS',
    description: 'Sistema de punto de venta para restaurantes',
  },
  {
    value: 'restaurantepos',
    label: 'POS Genérico',
    description: 'Conector genérico para cualquier POS con API REST estándar',
  },
];
