/**
 * Conector para Toteat POS
 * Documentación: [URL de la API de Toteat - agregar cuando esté disponible]
 */

import { BasePOSConnector } from './base';
import {
  UPICOrder,
  POSTestResult,
  POSOrderResult,
  POSCredentials,
} from '../types';

export class ToteatConnector extends BasePOSConnector {
  /**
   * Test de conexión con Toteat
   * Endpoint: GET /api/v1/test-connection
   * O el endpoint que Toteat proporcione para verificar credenciales
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

      // TODO: Reemplazar con el endpoint real de Toteat cuando esté disponible
      // Por ahora, simulamos una verificación básica
      const response = await this.request('/api/v1/test-connection', {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: 'Conexión exitosa con Toteat POS',
          data,
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: 'Error al conectar con Toteat POS',
          error: errorData.message || `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error de conexión con Toteat POS',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Enviar pedido a Toteat
   * Endpoint: POST /api/v1/orders
   * Formato: Adaptar según la documentación de Toteat
   */
  async sendOrder(order: UPICOrder): Promise<POSOrderResult> {
    try {
      // Transformar pedido UPIC al formato de Toteat
      const toteatOrder = this.transformOrder(order);

      const response = await this.request('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify(toteatOrder),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          posOrderId: data.orderId || data.id,
          message: 'Pedido enviado exitosamente a Toteat',
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: 'Error al enviar pedido a Toteat',
          error: errorData.message || `HTTP ${response.status}`,
          retryable: response.status >= 500,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error al enviar pedido a Toteat',
        error: error instanceof Error ? error.message : 'Error desconocido',
        retryable: true,
      };
    }
  }

  /**
   * Transformar pedido UPIC al formato de Toteat
   * TODO: Ajustar según la estructura real de la API de Toteat
   */
  private transformOrder(order: UPICOrder): any {
    return {
      orderId: order.orderId,
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.qty,
        price: item.price / 100, // Convertir centavos a pesos
        notes: item.notes,
        modifiers: item.options?.map((opt) => ({
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
        transactionId: order.payment.transactionId,
      },
      notes: order.notes,
      totalAmount: order.totalAmount / 100,
      restaurantId: this.credentials.restaurantId,
    };
  }
}
