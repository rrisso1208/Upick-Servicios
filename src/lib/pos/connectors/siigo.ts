/**
 * Conector para Siigo POS (Restaurantes/Gastrobar)
 * Siigo es un sistema de facturación y POS muy usado en Colombia
 * Documentación API: https://siigoapi.azure-api.net/ (verificar URL real)
 */

import { BasePOSConnector } from './base';
import { UPICOrder, POSTestResult, POSOrderResult } from '../types';

export class SiigoConnector extends BasePOSConnector {
  /**
   * Test de conexión con Siigo
   * Endpoint: GET /api/v1/auth/validate o /api/v1/status
   * Autenticación: Bearer Token (OAuth 2.0)
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

      // TODO: Reemplazar con el endpoint real de Siigo cuando esté disponible
      // Siigo usa OAuth 2.0, puede requerir token de acceso
      const response = await this.request('/api/v1/auth/validate', {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          success: true,
          message: 'Conexión exitosa con Siigo POS',
          data,
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: 'Error al conectar con Siigo POS',
          error: errorData.message || `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error de conexión con Siigo POS',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Enviar pedido a Siigo
   * Endpoint: POST /api/v1/sales o /api/v1/invoices
   * Formato: Adaptar según la documentación de Siigo
   */
  async sendOrder(order: UPICOrder): Promise<POSOrderResult> {
    try {
      const siigoOrder = this.transformOrder(order);

      // TODO: Verificar el endpoint real de Siigo para crear pedidos/ventas
      const response = await this.request('/api/v1/sales', {
        method: 'POST',
        body: JSON.stringify(siigoOrder),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          posOrderId: data.id || data.saleId || data.invoiceId,
          message: 'Pedido enviado exitosamente a Siigo',
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: 'Error al enviar pedido a Siigo',
          error: errorData.message || `HTTP ${response.status}`,
          retryable: response.status >= 500,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error al enviar pedido a Siigo',
        error: error instanceof Error ? error.message : 'Error desconocido',
        retryable: true,
      };
    }
  }

  /**
   * Transformar pedido UPIC al formato de Siigo
   * TODO: Ajustar según la estructura real de la API de Siigo
   * Siigo puede requerir formato de factura electrónica según normativa DIAN
   */
  private transformOrder(order: UPICOrder): any {
    return {
      document_type: 'SALE', // Tipo de documento para venta
      customer: {
        name: order.customer.name,
        identification: order.customer.phone, // Puede ser cédula/NIT
        phone: order.customer.phone,
        email: order.customer.email,
      },
      items: order.items.map((item) => ({
        code: item.name.substring(0, 20), // Código del producto
        description: item.name,
        quantity: item.qty,
        price: item.price / 100,
        total: (item.price * item.qty) / 100,
        tax: 0, // IVA según configuración
        modifiers: item.options?.map((opt) => ({
          description: opt.name,
          price: opt.price / 100,
        })),
      })),
      payment_method: this.mapPaymentMethod(order.payment.method),
      total: order.totalAmount / 100,
      notes: order.notes,
      reference: order.orderId, // Referencia externa
    };
  }

  /**
   * Mapear método de pago de UPIC a Siigo
   */
  private mapPaymentMethod(method: string): string {
    const mapping: Record<string, string> = {
      CARD: 'TARJETA',
      PSE: 'TRANSFERENCIA',
      CASH: 'EFECTIVO',
      NEQUI: 'NEQUI',
      DAVIPLATA: 'DAVIPLATA',
    };
    return mapping[method.toUpperCase()] || 'OTRO';
  }
}
