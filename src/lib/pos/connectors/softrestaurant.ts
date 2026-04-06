/**
 * Conector para SoftRestaurant POS
 * Documentación: [URL de la API de SoftRestaurant - agregar cuando esté disponible]
 */

import { BasePOSConnector } from './base';
import { UPICOrder, POSTestResult, POSOrderResult } from '../types';

export class SoftRestaurantConnector extends BasePOSConnector {
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

      // TODO: Reemplazar con el endpoint real de SoftRestaurant
      const response = await this.request('/api/v1/health', {
        method: 'GET',
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Conexión exitosa con SoftRestaurant POS',
        };
      } else {
        return {
          success: false,
          message: 'Error al conectar con SoftRestaurant POS',
          error: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error de conexión con SoftRestaurant POS',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  async sendOrder(order: UPICOrder): Promise<POSOrderResult> {
    try {
      const softRestaurantOrder = this.transformOrder(order);

      const response = await this.request('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify(softRestaurantOrder),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          posOrderId: data.orderId || data.id,
          message: 'Pedido enviado exitosamente a SoftRestaurant',
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: 'Error al enviar pedido a SoftRestaurant',
          error: errorData.message || `HTTP ${response.status}`,
          retryable: response.status >= 500,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error al enviar pedido a SoftRestaurant',
        error: error instanceof Error ? error.message : 'Error desconocido',
        retryable: true,
      };
    }
  }

  private transformOrder(order: UPICOrder): any {
    return {
      externalOrderId: order.orderId,
      items: order.items.map((item) => ({
        productName: item.name,
        quantity: item.qty,
        unitPrice: item.price / 100,
        subtotal: (item.price * item.qty) / 100,
        notes: item.notes,
        options: item.options?.map((opt) => ({
          name: opt.name,
          price: opt.price / 100,
        })),
      })),
      customer: {
        name: order.customer.name,
        phone: order.customer.phone,
      },
      total: order.totalAmount / 100,
      paymentMethod: order.payment.method,
      notes: order.notes,
    };
  }
}
