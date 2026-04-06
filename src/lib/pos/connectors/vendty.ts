/**
 * Conector para Vendty POS
 * Vendty es uno de los POS más populares en Colombia para restaurantes y gastrobares
 * Documentación API: https://docs.vendty.com (verificar URL real)
 */

import { BasePOSConnector } from './base';
import { UPICOrder, POSTestResult, POSOrderResult, POSMenu } from '../types';

export class VendtyConnector extends BasePOSConnector {
  /**
   * Obtener menú desde Vendty
   * TODO: Implementar cuando esté disponible la documentación de la API
   * Endpoint esperado: GET /api/v1/menu o GET /api/v1/items
   */
  async getMenu(): Promise<POSMenu> {
    try {
      // TODO: Reemplazar con el endpoint real de Vendty cuando esté disponible
      const response = await this.request('/api/v1/menu', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Error al obtener menú: HTTP ${response.status}`);
      }

      const data = await response.json();

      // TODO: Adaptar según la estructura real de la API de Vendty
      return {
        categories: data.categories || [],
        items: data.items || [],
        syncedAt: new Date(),
      };
    } catch (error: any) {
      this.logger.error({ error }, 'Error al obtener menú de Vendty');
      throw error;
    }
  }

  /**
   * Test de conexión con Vendty
   * Endpoint: GET /api/v1/health o /api/v1/status
   * Autenticación: Bearer Token (API Key)
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

      // TODO: Reemplazar con el endpoint real de Vendty cuando esté disponible
      // Vendty generalmente usa Bearer Token para autenticación
      const response = await this.request('/api/v1/health', {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          success: true,
          message: 'Conexión exitosa con Vendty POS',
          data,
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: 'Error al conectar con Vendty POS',
          error: errorData.message || `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error de conexión con Vendty POS',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Enviar pedido a Vendty
   * Endpoint: POST /api/v1/orders o /api/v1/sales
   * Formato: Adaptar según la documentación de Vendty
   */
  async sendOrder(order: UPICOrder): Promise<POSOrderResult> {
    try {
      const vendtyOrder = this.transformOrder(order);

      // TODO: Verificar el endpoint real de Vendty para crear pedidos
      const response = await this.request('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify(vendtyOrder),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          posOrderId: data.id || data.orderId || data.saleId,
          message: 'Pedido enviado exitosamente a Vendty',
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: 'Error al enviar pedido a Vendty',
          error: errorData.message || `HTTP ${response.status}`,
          retryable: response.status >= 500,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error al enviar pedido a Vendty',
        error: error instanceof Error ? error.message : 'Error desconocido',
        retryable: true,
      };
    }
  }

  /**
   * Transformar pedido UPIC al formato de Vendty
   * TODO: Ajustar según la estructura real de la API de Vendty
   */
  private transformOrder(order: UPICOrder): any {
    return {
      external_order_id: order.orderId,
      customer: {
        name: order.customer.name,
        phone: order.customer.phone,
        email: order.customer.email,
      },
      items: order.items.map((item) => ({
        // Usar posItemId si está disponible (menú importado desde POS)
        item_id: item.posItemId || item.name,
        name: item.name,
        quantity: item.qty,
        unit_price: item.price / 100, // Convertir centavos a pesos
        total: (item.price * item.qty) / 100,
        notes: item.notes,
        modifiers: item.options?.map((opt) => ({
          name: opt.name,
          price: opt.price / 100,
          // Usar posOptionId si está disponible
          id: opt.posOptionId,
        })),
      })),
      payment: {
        method: this.mapPaymentMethod(order.payment.method),
        status: order.payment.status,
        transaction_id: order.payment.transactionId,
      },
      total: order.totalAmount / 100,
      notes: order.notes,
      order_type: order.serviceMode || 'TAKEOUT', // TAKEOUT, DINE_IN, DELIVERY
      pickup_code: order.pickupCode,
    };
  }

  /**
   * Mapear método de pago de UPIC a Vendty
   */
  private mapPaymentMethod(method: string): string {
    const mapping: Record<string, string> = {
      CARD: 'card',
      PSE: 'pse',
      CASH: 'cash',
      NEQUI: 'nequi',
      DAVIPLATA: 'daviplata',
    };
    return mapping[method.toUpperCase()] || method.toLowerCase();
  }
}
