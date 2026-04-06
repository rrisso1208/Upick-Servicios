/**
 * Conector para Micros Oracle POS
 * Documentación: [URL de la API de Micros - agregar cuando esté disponible]
 */

import { BasePOSConnector } from './base';
import { UPICOrder, POSTestResult, POSOrderResult } from '../types';

export class MicrosConnector extends BasePOSConnector {
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

      // TODO: Reemplazar con el endpoint real de Micros
      const response = await this.request('/api/v1/status', {
        method: 'GET',
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Conexión exitosa con Micros POS',
        };
      } else {
        return {
          success: false,
          message: 'Error al conectar con Micros POS',
          error: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error de conexión con Micros POS',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  async sendOrder(order: UPICOrder): Promise<POSOrderResult> {
    try {
      const microsOrder = this.transformOrder(order);

      const response = await this.request('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify(microsOrder),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          posOrderId: data.orderId || data.id,
          message: 'Pedido enviado exitosamente a Micros',
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: 'Error al enviar pedido a Micros',
          error: errorData.message || `HTTP ${response.status}`,
          retryable: response.status >= 500,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error al enviar pedido a Micros',
        error: error instanceof Error ? error.message : 'Error desconocido',
        retryable: true,
      };
    }
  }

  private transformOrder(order: UPICOrder): any {
    return {
      externalOrderNumber: order.orderId,
      orderItems: order.items.map((item) => ({
        itemName: item.name,
        quantity: item.qty,
        price: item.price / 100,
        modifiers: item.options?.map((opt) => ({
          modifierName: opt.name,
          modifierPrice: opt.price / 100,
        })),
      })),
      guest: {
        name: order.customer.name,
        phone: order.customer.phone,
      },
      totalAmount: order.totalAmount / 100,
      paymentType: order.payment.method,
      specialInstructions: order.notes,
    };
  }
}
