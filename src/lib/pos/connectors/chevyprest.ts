/**
 * Conector para Chevyprest POS
 * Documentación: [URL de la API de Chevyprest - agregar cuando esté disponible]
 */

import { BasePOSConnector } from './base';
import { UPICOrder, POSTestResult, POSOrderResult } from '../types';

export class ChevyprestConnector extends BasePOSConnector {
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

      // TODO: Reemplazar con el endpoint real de Chevyprest
      const response = await this.request('/api/v1/test', {
        method: 'GET',
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Conexión exitosa con Chevyprest POS',
        };
      } else {
        return {
          success: false,
          message: 'Error al conectar con Chevyprest POS',
          error: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error de conexión con Chevyprest POS',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  async sendOrder(order: UPICOrder): Promise<POSOrderResult> {
    try {
      const chevyprestOrder = this.transformOrder(order);

      const response = await this.request('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify(chevyprestOrder),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          posOrderId: data.orderId || data.id,
          message: 'Pedido enviado exitosamente a Chevyprest',
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: 'Error al enviar pedido a Chevyprest',
          error: errorData.message || `HTTP ${response.status}`,
          retryable: response.status >= 500,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error al enviar pedido a Chevyprest',
        error: error instanceof Error ? error.message : 'Error desconocido',
        retryable: true,
      };
    }
  }

  private transformOrder(order: UPICOrder): any {
    return {
      orderId: order.orderId,
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.qty,
        price: item.price / 100,
        extras: item.options?.map((opt) => ({
          name: opt.name,
          price: opt.price / 100,
        })),
      })),
      customer: {
        name: order.customer.name,
        phone: order.customer.phone,
      },
      total: order.totalAmount / 100,
      payment: order.payment.method,
      comments: order.notes,
    };
  }
}
