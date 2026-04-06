/**
 * Conector para Binda POS
 * Documentación: [URL de la API de Binda - agregar cuando esté disponible]
 */

import { BasePOSConnector } from './base';
import { UPICOrder, POSTestResult, POSOrderResult } from '../types';

export class BindaConnector extends BasePOSConnector {
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

      // TODO: Reemplazar con el endpoint real de Binda
      const response = await this.request('/api/v1/connection-test', {
        method: 'GET',
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Conexión exitosa con Binda POS',
        };
      } else {
        return {
          success: false,
          message: 'Error al conectar con Binda POS',
          error: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error de conexión con Binda POS',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  async sendOrder(order: UPICOrder): Promise<POSOrderResult> {
    try {
      const bindaOrder = this.transformOrder(order);

      const response = await this.request('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify(bindaOrder),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          posOrderId: data.orderId || data.id,
          message: 'Pedido enviado exitosamente a Binda',
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: 'Error al enviar pedido a Binda',
          error: errorData.message || `HTTP ${response.status}`,
          retryable: response.status >= 500,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error al enviar pedido a Binda',
        error: error instanceof Error ? error.message : 'Error desconocido',
        retryable: true,
      };
    }
  }

  private transformOrder(order: UPICOrder): any {
    return {
      externalOrderId: order.orderId,
      orderLines: order.items.map((item) => ({
        productName: item.name,
        quantity: item.qty,
        unitPrice: item.price / 100,
        totalPrice: (item.price * item.qty) / 100,
        addons: item.options?.map((opt) => ({
          name: opt.name,
          price: opt.price / 100,
        })),
      })),
      customer: {
        fullName: order.customer.name,
        phoneNumber: order.customer.phone,
      },
      orderTotal: order.totalAmount / 100,
      paymentMethod: order.payment.method,
      specialInstructions: order.notes,
    };
  }
}
