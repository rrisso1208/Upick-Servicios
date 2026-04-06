/**
 * Conector para Simphony Oracle POS
 * Documentación: [URL de la API de Simphony - agregar cuando esté disponible]
 */

import { BasePOSConnector } from './base';
import { UPICOrder, POSTestResult, POSOrderResult } from '../types';

export class SimphonyConnector extends BasePOSConnector {
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

      // TODO: Reemplazar con el endpoint real de Simphony
      const response = await this.request('/api/v1/ping', {
        method: 'GET',
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Conexión exitosa con Simphony POS',
        };
      } else {
        return {
          success: false,
          message: 'Error al conectar con Simphony POS',
          error: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error de conexión con Simphony POS',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  async sendOrder(order: UPICOrder): Promise<POSOrderResult> {
    try {
      const simphonyOrder = this.transformOrder(order);

      const response = await this.request('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify(simphonyOrder),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          posOrderId: data.orderId || data.id,
          message: 'Pedido enviado exitosamente a Simphony',
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: 'Error al enviar pedido a Simphony',
          error: errorData.message || `HTTP ${response.status}`,
          retryable: response.status >= 500,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error al enviar pedido a Simphony',
        error: error instanceof Error ? error.message : 'Error desconocido',
        retryable: true,
      };
    }
  }

  private transformOrder(order: UPICOrder): any {
    return {
      orderReference: order.orderId,
      orderItems: order.items.map((item) => ({
        itemDescription: item.name,
        quantity: item.qty,
        unitPrice: item.price / 100,
        modifiers: item.options?.map((opt) => ({
          name: opt.name,
          price: opt.price / 100,
        })),
      })),
      customerInfo: {
        name: order.customer.name,
        phone: order.customer.phone,
      },
      orderTotal: order.totalAmount / 100,
      paymentInfo: {
        method: order.payment.method,
        status: order.payment.status,
      },
      notes: order.notes,
    };
  }
}
