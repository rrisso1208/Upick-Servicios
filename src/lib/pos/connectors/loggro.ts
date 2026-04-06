/**
 * Conector para Loggro POS Restobar
 * Loggro es un sistema POS especializado para restaurantes y bares en Colombia
 * Documentación API: [URL de la API de Loggro - agregar cuando esté disponible]
 */

import { BasePOSConnector } from './base';
import { UPICOrder, POSTestResult, POSOrderResult } from '../types';

export class LoggroConnector extends BasePOSConnector {
  /**
   * Test de conexión con Loggro
   * Endpoint: GET /api/v1/connection-test o /api/v1/status
   * Autenticación: API Key o Bearer Token
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

      // TODO: Reemplazar con el endpoint real de Loggro cuando esté disponible
      const response = await this.request('/api/v1/connection-test', {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          success: true,
          message: 'Conexión exitosa con Loggro POS',
          data,
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: 'Error al conectar con Loggro POS',
          error: errorData.message || `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error de conexión con Loggro POS',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Enviar pedido a Loggro
   * Endpoint: POST /api/v1/orders o /api/v1/tickets
   * Formato: Adaptar según la documentación de Loggro
   */
  async sendOrder(order: UPICOrder): Promise<POSOrderResult> {
    try {
      const loggroOrder = this.transformOrder(order);

      // TODO: Verificar el endpoint real de Loggro para crear pedidos
      const response = await this.request('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify(loggroOrder),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          posOrderId: data.id || data.orderId || data.ticketId,
          message: 'Pedido enviado exitosamente a Loggro',
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: 'Error al enviar pedido a Loggro',
          error: errorData.message || `HTTP ${response.status}`,
          retryable: response.status >= 500,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error al enviar pedido a Loggro',
        error: error instanceof Error ? error.message : 'Error desconocido',
        retryable: true,
      };
    }
  }

  /**
   * Transformar pedido UPIC al formato de Loggro
   * TODO: Ajustar según la estructura real de la API de Loggro
   */
  private transformOrder(order: UPICOrder): any {
    return {
      external_order_id: order.orderId,
      table_number: order.table,
      customer: {
        name: order.customer.name,
        phone: order.customer.phone,
        email: order.customer.email,
      },
      order_items: order.items.map((item) => ({
        product_name: item.name,
        quantity: item.qty,
        unit_price: item.price / 100,
        subtotal: (item.price * item.qty) / 100,
        notes: item.notes,
        addons: item.options?.map((opt) => ({
          name: opt.name,
          price: opt.price / 100,
        })),
      })),
      payment: {
        method: order.payment.method,
        status: order.payment.status,
        transaction_id: order.payment.transactionId,
      },
      total: order.totalAmount / 100,
      service_type: order.serviceMode || 'TAKEOUT',
      notes: order.notes,
      pickup_code: order.pickupCode,
    };
  }
}
