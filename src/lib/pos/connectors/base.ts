/**
 * Clase base para conectores POS
 * Todos los conectores deben extender esta clase
 */

import {
  UPICOrder,
  POSTestResult,
  POSOrderResult,
  POSCredentials,
  POSMenu,
} from '../types';
import logger from '../../logger';

export abstract class BasePOSConnector {
  protected credentials: POSCredentials;
  protected baseUrl?: string;
  protected logger = logger;

  constructor(credentials: POSCredentials) {
    this.credentials = credentials;
    this.baseUrl = credentials.baseUrl;
  }

  /**
   * Test de conexión con el POS
   * Cada conector debe implementar su propia lógica
   */
  abstract testConnection(): Promise<POSTestResult>;

  /**
   * Enviar pedido al POS
   * Cada conector debe implementar su propia transformación
   */
  abstract sendOrder(order: UPICOrder): Promise<POSOrderResult>;

  /**
   * Obtener menú desde el POS (opcional)
   * Cada conector puede implementar su propia lógica
   */
  async getMenu(): Promise<POSMenu> {
    // Implementación por defecto: no soportado
    throw new Error('getMenu no está implementado para este POS');
  }

  /**
   * Consultar estado de una orden en el POS (opcional)
   */
  async getOrderStatus(posOrderId: string): Promise<any> {
    // Implementación por defecto: no soportado
    throw new Error('getOrderStatus no está implementado para este POS');
  }

  /**
   * Preparar headers para requests HTTP
   */
  protected getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // API Key
    if (this.credentials.apiKey) {
      headers['X-API-Key'] = this.credentials.apiKey;
      headers['Authorization'] = `Bearer ${this.credentials.apiKey}`;
    }

    // API Token
    if (this.credentials.apiToken) {
      headers['Authorization'] = `Bearer ${this.credentials.apiToken}`;
    }

    // Basic Auth
    if (this.credentials.username && this.credentials.password) {
      const basicAuth = Buffer.from(
        `${this.credentials.username}:${this.credentials.password}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${basicAuth}`;
    }

    return headers;
  }

  /**
   * Realizar request HTTP con reintentos
   */
  protected async request(
    endpoint: string,
    options: RequestInit = {},
    maxRetries: number = 3
  ): Promise<Response> {
    const url = this.baseUrl ? `${this.baseUrl}${endpoint}` : endpoint;

    const headers = {
      ...this.getHeaders(),
      ...options.headers,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers,
        });

        // Si es exitoso o error no recuperable, retornar
        if (response.ok || response.status < 500) {
          return response;
        }

        // Si es error 5xx, reintentar
        if (response.status >= 500 && attempt < maxRetries - 1) {
          await this.delay(1000 * (attempt + 1)); // Backoff exponencial
          continue;
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxRetries - 1) {
          await this.delay(1000 * (attempt + 1));
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Delay helper para reintentos
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validar credenciales básicas
   */
  protected validateCredentials(): { valid: boolean; error?: string } {
    if (!this.credentials) {
      return { valid: false, error: 'Credenciales no proporcionadas' };
    }

    // Validación básica: al menos debe tener apiKey o apiToken o username/password
    const hasApiKey = !!this.credentials.apiKey;
    const hasApiToken = !!this.credentials.apiToken;
    const hasBasicAuth =
      !!this.credentials.username && !!this.credentials.password;

    if (!hasApiKey && !hasApiToken && !hasBasicAuth) {
      return {
        valid: false,
        error: 'Se requiere al menos una forma de autenticación',
      };
    }

    return { valid: true };
  }
}
