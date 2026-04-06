/**
 * Conector para Loyverse POS
 * Loyverse es un sistema POS gratuito muy popular en restaurantes pequeños y medianos
 * Documentación API: https://developer.loyverse.com/docs
 */

import { BasePOSConnector } from './base';
import {
  UPICOrder,
  POSTestResult,
  POSOrderResult,
  POSMenu,
  POSMenuCategory,
  POSMenuItem,
} from '../types';

export class LoyverseConnector extends BasePOSConnector {
  /**
   * Obtener menú desde Loyverse
   * Endpoints: GET /v1/items y GET /v1/categories
   * Documentación: https://developer.loyverse.com/docs#items
   */
  async getMenu(): Promise<POSMenu> {
    try {
      const validation = this.validateCredentials();
      if (!validation.valid) {
        throw new Error(validation.error || 'Credenciales inválidas');
      }

      const baseUrl = this.baseUrl || 'https://api.loyverse.com';
      const fullUrlBase = baseUrl.includes('loyverse.com')
        ? baseUrl
        : this.baseUrl || 'https://api.loyverse.com';

      // Obtener categorías
      const categoriesResponse = await this.request('/v1/categories', {
        method: 'GET',
      });

      if (!categoriesResponse.ok) {
        throw new Error(
          `Error al obtener categorías: HTTP ${categoriesResponse.status}`
        );
      }

      const categoriesData = await categoriesResponse.json();
      const categories: POSMenuCategory[] = (
        categoriesData.categories || []
      ).map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        sort: cat.sort_order || 0,
        isActive: !cat.deleted_at,
      }));

      // Obtener items
      const itemsResponse = await this.request('/v1/items', {
        method: 'GET',
      });

      if (!itemsResponse.ok) {
        throw new Error(`Error al obtener items: HTTP ${itemsResponse.status}`);
      }

      const itemsData = await itemsResponse.json();
      const items: POSMenuItem[] = (itemsData.items || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: Math.round((item.price || 0) * 100), // Convertir a centavos
        categoryId: item.category_id || '',
        categoryName: categories.find((c) => c.id === item.category_id)?.name,
        imageUrl: item.image_url,
        isAvailable:
          !item.deleted_at && item.track_inventory
            ? (item.quantity || 0) > 0
            : true,
        inventoryQuantity: item.track_inventory ? item.quantity : undefined,
        // Loyverse tiene variantes (variants) que pueden ser opciones
        options: item.variants?.map((variant: any) => ({
          id: variant.id,
          name: variant.name || item.name,
          priceDelta:
            Math.round((variant.price || 0) * 100) -
            Math.round((item.price || 0) * 100),
          isDefault: variant.is_default,
        })),
      }));

      return {
        categories,
        items,
        syncedAt: new Date(),
      };
    } catch (error: any) {
      this.logger.error({ error }, 'Error al obtener menú de Loyverse');
      throw error;
    }
  }

  /**
   * Test de conexión con Loyverse
   * Endpoint: GET /api/v1/stores (Loyverse API real)
   * Autenticación: Bearer Token (Access Token)
   * Documentación: https://developer.loyverse.com/docs#authentication
   */
  async testConnection(): Promise<POSTestResult> {
    try {
      const validation = this.validateCredentials();
      if (!validation.valid) {
        return {
          success: false,
          message: validation.error || 'Credenciales inválidas',
          error: validation.error,
        };
      }

      // Loyverse API real endpoint para verificar conexión
      // GET https://api.loyverse.com/v1/stores
      const response = await this.request('/v1/stores', {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          success: true,
          message: 'Conexión exitosa con Loyverse POS',
          data,
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: 'Error al conectar con Loyverse POS',
          error: errorData.message || `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error de conexión con Loyverse POS',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Enviar pedido a Loyverse
   * Endpoint: POST /v1/receipts (Loyverse API real)
   * Documentación: https://developer.loyverse.com/docs#receipts
   */
  async sendOrder(order: UPICOrder): Promise<POSOrderResult> {
    try {
      const loyverseReceipt = this.transformOrder(order);

      // Loyverse API real endpoint para crear recibos
      // Base URL debe ser: https://api.loyverse.com
      const baseUrl = this.baseUrl || 'https://api.loyverse.com';
      const fullUrl = baseUrl.includes('loyverse.com')
        ? '/v1/receipts'
        : '/api/v1/receipts';

      const response = await this.request(fullUrl, {
        method: 'POST',
        body: JSON.stringify(loyverseReceipt),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          posOrderId: data.id || data.receipt_id,
          message: 'Pedido enviado exitosamente a Loyverse',
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: 'Error al enviar pedido a Loyverse',
          error: errorData.message || `HTTP ${response.status}`,
          retryable: response.status >= 500,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error al enviar pedido a Loyverse',
        error: error instanceof Error ? error.message : 'Error desconocido',
        retryable: true,
      };
    }
  }

  /**
   * Transformar pedido UPIC al formato de Loyverse Receipt
   * Documentación: https://developer.loyverse.com/docs#receipts
   */
  private transformOrder(order: UPICOrder): any {
    // Loyverse requiere store_id, pero lo podemos obtener de las credenciales
    const storeId = this.credentials.storeId || this.credentials.restaurantId;

    return {
      store_id: storeId,
      receipt_number: order.orderId, // Número de referencia externa
      receipt_type: 'SALE', // Tipo de recibo: SALE, RETURN, etc.
      customer: {
        name: order.customer.name,
        phone: order.customer.phone,
        email: order.customer.email,
      },
      line_items: order.items.map((item) => ({
        // Usar posItemId si está disponible (menú importado desde POS), sino usar nombre
        item_id: item.posItemId || item.name.substring(0, 50),
        name: item.name,
        quantity: item.qty,
        price: item.price / 100, // Precio unitario en pesos
        modifiers: item.options?.map((opt) => ({
          name: opt.name,
          price: opt.price / 100,
          // Usar posOptionId si está disponible
          id: opt.posOptionId,
        })),
      })),
      payments: [
        {
          type: this.mapPaymentMethod(order.payment.method),
          amount: order.totalAmount / 100,
        },
      ],
      total: order.totalAmount / 100,
      notes: order.notes,
      // Campos adicionales de Loyverse
      reference_number: order.pickupCode,
      order_type: order.serviceMode || 'TAKEOUT',
    };
  }

  /**
   * Mapear método de pago de UPIC a Loyverse
   * Loyverse soporta: CASH, CARD, GIFT_CARD, OTHER
   */
  private mapPaymentMethod(method: string): string {
    const mapping: Record<string, string> = {
      CARD: 'CARD',
      PSE: 'CARD', // PSE se mapea a CARD en Loyverse
      CASH: 'CASH',
      NEQUI: 'OTHER',
      DAVIPLATA: 'OTHER',
    };
    return mapping[method.toUpperCase()] || 'OTHER';
  }

  /**
   * Override del método getHeaders para Loyverse
   * Loyverse usa Bearer Token con el Access Token
   */
  protected getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Loyverse requiere Bearer Token
    if (this.credentials.apiToken) {
      headers['Authorization'] = `Bearer ${this.credentials.apiToken}`;
    } else if (this.credentials.apiKey) {
      headers['Authorization'] = `Bearer ${this.credentials.apiKey}`;
    }

    return headers;
  }
}
