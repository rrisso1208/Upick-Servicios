/**
 * Tipos para integración POS
 */

/**
 * Esquema estándar de pedido UPIC antes de enviar al POS
 */
export interface UPICOrder {
  orderId: string;
  restaurantId: string;
  restaurantName?: string;
  totalAmount: number; // Total amount in cents
  createdAt: string;
  items: Array<{
    name: string;
    qty: number;
    price: number; // In cents
    notes?: string;
    posItemId?: string; // ID del item en el POS (si está disponible)
    options?: Array<{
      name: string;
      price: number; // In cents
      priceDelta?: number; // In cents (optional for compatibility)
      posOptionId?: string; // ID de la opción en el POS (si está disponible)
    }>;
  }>;
  table?: string; // O pickupCode
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  payment: {
    method: string; // e.g., "CARD", "PSE", "CASH"
    status: string; // e.g., "APPROVED", "PENDING", "DECLINED"
    amount: number; // Total amount in cents
    transactionId?: string;
  };
  notes?: string; // General order notes
  pickupCode: string;
  pickupTime?: Date;
  serviceMode?: 'takeaway' | 'eat_in' | 'internal_delivery';
}

/**
 * Esquema de menú desde POS
 */
export interface POSMenuCategory {
  id: string; // ID de categoría en POS
  name: string;
  description?: string;
  sort?: number;
  isActive?: boolean;
}

export interface POSMenuItem {
  id: string; // ID del item en POS (posItemId)
  name: string;
  description?: string;
  price: number; // En centavos
  categoryId: string; // ID de categoría en POS
  categoryName?: string;
  imageUrl?: string;
  isAvailable?: boolean;
  inventoryQuantity?: number; // Si el POS maneja inventario
  options?: Array<{
    id: string; // ID de opción en POS
    name: string;
    priceDelta: number; // En centavos
    isDefault?: boolean;
  }>;
  modifiers?: Array<{
    id: string;
    name: string;
    options: Array<{
      id: string;
      name: string;
      priceDelta: number;
    }>;
  }>;
}

export interface POSMenu {
  categories: POSMenuCategory[];
  items: POSMenuItem[];
  syncedAt: Date;
}

/**
 * Credenciales del POS
 */
export interface POSCredentials {
  apiKey?: string;
  apiToken?: string;
  baseUrl?: string;
  username?: string;
  password?: string;
  storeId?: string; // Para POS que requieren store ID (ej: Loyverse)
  restaurantId?: string; // ID del restaurante en el POS
  [key: string]: any; // Para credenciales adicionales específicas del POS
}

/**
 * Configuración POS de restaurante
 */
export interface RestaurantPOSConfig {
  posType: POSType | null;
  posEnabled: boolean;
  posCredentials: POSCredentials | null;
  lastTestAt?: Date;
  lastTestResult?: POSTestResult;
}

/**
 * Resultado de test de conexión
 */
export interface POSTestResult {
  success: boolean;
  message: string;
  error?: string;
  data?: any;
}

/**
 * Resultado de envío de pedido
 */
export interface POSOrderResult {
  success: boolean;
  message: string;
  posOrderId?: string;
  error?: string;
  retryable?: boolean;
}

/**
 * Tipos de POS soportados (priorizados para Colombia)
 */
export type POSType =
  | 'vendty' // Vendty POS - Muy popular en Colombia
  | 'siigo' // Siigo POS - Facturación y POS
  | 'softrestaurant' // SoftRestaurant - Gestión restaurantes
  | 'loggro' // Loggro POS Restobar
  | 'loyverse' // Loyverse POS - Gratuito y popular
  | 'toteat' // Toteat / Fudo POS
  | 'restaurantepos'; // Genérico para cualquier POS futuro con API

/**
 * Fuente del menú
 */
export enum MenuSource {
  POS = 'POS', // Menú importado desde POS
  MANUAL = 'MANUAL', // Menú creado manualmente en YouPick
}
