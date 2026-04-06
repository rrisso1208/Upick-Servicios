/**
 * Conector genérico para APIs de POS futuras
 * Este conector puede ser configurado para trabajar con cualquier API REST
 * que siga un patrón estándar
 */

import { BasePOSConnector } from './base';
import { UPICOrder, POSTestResult, POSOrderResult, POSMenu } from '../types';

export class RestaurantePOSConnector extends BasePOSConnector {
  /**
   * Obtener menú desde POS genérico
   * Los endpoints pueden ser configurados en las credenciales
   */
  async getMenu(): Promise<POSMenu> {
    try {
      // Endpoints configurables
      const categoriesEndpoint =
        this.credentials.categoriesEndpoint || '/api/v1/categories';
      const itemsEndpoint = this.credentials.itemsEndpoint || '/api/v1/items';

      // Obtener categorías
      const categoriesResponse = await this.request(categoriesEndpoint, {
        method: 'GET',
      });

      if (!categoriesResponse.ok) {
        throw new Error(
          `Error al obtener categorías: HTTP ${categoriesResponse.status}`
        );
      }

      const categoriesData = await categoriesResponse.json();
      const categories = Array.isArray(categoriesData)
        ? categoriesData
        : categoriesData.categories || [];

      // Obtener items
      const itemsResponse = await this.request(itemsEndpoint, {
        method: 'GET',
      });

      if (!itemsResponse.ok) {
        throw new Error(`Error al obtener items: HTTP ${itemsResponse.status}`);
      }

      const itemsData = await itemsResponse.json();
      const items = Array.isArray(itemsData)
        ? itemsData
        : itemsData.items || [];

      return {
        categories: categories.map((cat: any) => ({
          id: cat.id || cat.categoryId,
          name: cat.name || cat.categoryName,
          description: cat.description,
          sort: cat.sort || cat.sortOrder || 0,
          isActive: cat.isActive !== false,
        })),
        items: items.map((item: any) => ({
          id: item.id || item.itemId,
          name: item.name || item.itemName,
          description: item.description,
          price: Math.round((item.price || 0) * 100), // Convertir a centavos
          categoryId: item.categoryId || item.category_id,
          imageUrl: item.imageUrl || item.image_url,
          isAvailable: item.isAvailable !== false,
        })),
        syncedAt: new Date(),
      };
    } catch (error: any) {
      this.logger.error({ error }, 'Error al obtener menú del POS genérico');
      throw error;
    }
  }

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

      // El endpoint de test puede ser configurado en las credenciales
      const testEndpoint =
        this.credentials.testEndpoint || '/api/v1/test-connection';

      const response = await this.request(testEndpoint, {
        method: 'GET',
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Conexión exitosa con el POS',
        };
      } else {
        return {
          success: false,
          message: 'Error al conectar con el POS',
          error: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error de conexión con el POS',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  async sendOrder(order: UPICOrder): Promise<POSOrderResult> {
    try {
      // El formato puede ser configurado en las credenciales
      const orderFormat = this.credentials.orderFormat || 'standard';
      const transformedOrder = this.transformOrder(order, orderFormat);

      // El endpoint puede ser configurado
      const orderEndpoint = this.credentials.orderEndpoint || '/api/v1/orders';

      const response = await this.request(orderEndpoint, {
        method: 'POST',
        body: JSON.stringify(transformedOrder),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          posOrderId: data.orderId || data.id || data.order_id,
          message: 'Pedido enviado exitosamente al POS',
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: 'Error al enviar pedido al POS',
          error: errorData.message || `HTTP ${response.status}`,
          retryable: response.status >= 500,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error al enviar pedido al POS',
        error: error instanceof Error ? error.message : 'Error desconocido',
        retryable: true,
      };
    }
  }

  /**
   * Transformar pedido según el formato configurado
   */
  private transformOrder(order: UPICOrder, format: string = 'standard'): any {
    // Formato estándar (similar a UPIC)
    if (format === 'standard') {
      return {
        orderId: order.orderId,
        items: order.items.map((item) => ({
          name: item.name,
          quantity: item.qty,
          price: item.price / 100,
          options: item.options?.map((opt) => ({
            name: opt.name,
            price: opt.price / 100,
          })),
        })),
        customer: {
          name: order.customer.name,
          phone: order.customer.phone,
          email: order.customer.email,
        },
        payment: {
          method: order.payment.method,
          status: order.payment.status,
        },
        total: order.totalAmount / 100,
        notes: order.notes,
      };
    }

    // Formato simple (mínimo requerido)
    if (format === 'simple') {
      return {
        id: order.orderId,
        items: order.items,
        customer: order.customer,
        total: order.totalAmount / 100,
      };
    }

    // Formato personalizado (usar el mapeo de credenciales si existe)
    if (format === 'custom' && this.credentials.fieldMapping) {
      const mapping = this.credentials.fieldMapping as Record<string, string>;
      const customOrder: any = {};

      Object.entries(mapping).forEach(([targetField, sourcePath]) => {
        // Implementar lógica de mapeo personalizado si es necesario
        customOrder[targetField] = this.getNestedValue(order, sourcePath);
      });

      return customOrder;
    }

    // Por defecto, formato estándar
    return this.transformOrder(order, 'standard');
  }

  /**
   * Helper para obtener valores anidados de un objeto
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }
}
