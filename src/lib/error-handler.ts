/**
 * Centralized error handling utilities
 * Provides consistent error messages and logging
 */

import logger from './logger';
import { NextResponse } from 'next/server';

export interface ApiError {
  success: false;
  error: string;
  details?: any;
  code?: string;
}

/**
 * Create a standardized API error response
 */
export function createErrorResponse(
  error: string,
  status: number = 500,
  details?: any,
  code?: string
): NextResponse<ApiError> {
  logger.error({ error, status, details, code }, 'API Error');

  return NextResponse.json(
    {
      success: false,
      error,
      ...(details && { details }),
      ...(code && { code }),
    },
    { status }
  );
}

/**
 * Handle unexpected errors in API routes
 */
export function handleApiError(error: unknown): NextResponse<ApiError> {
  if (error instanceof Error) {
    // Don't expose internal error messages in production
    const message =
      process.env.NODE_ENV === 'production'
        ? 'Ocurrió un error interno. Por favor intenta de nuevo.'
        : error.message;

    return createErrorResponse(message, 500, undefined, 'INTERNAL_ERROR');
  }

  return createErrorResponse(
    'Ocurrió un error inesperado',
    500,
    undefined,
    'UNKNOWN_ERROR'
  );
}

/**
 * User-friendly error messages
 */
export const ErrorMessages = {
  UNAUTHORIZED: 'No tienes permiso para realizar esta acción',
  NOT_FOUND: 'El recurso solicitado no fue encontrado',
  VALIDATION_ERROR: 'Los datos proporcionados no son válidos',
  RATE_LIMIT_EXCEEDED:
    'Demasiadas solicitudes. Por favor intenta de nuevo más tarde',
  INTERNAL_ERROR: 'Ocurrió un error interno. Por favor intenta de nuevo',
  NETWORK_ERROR: 'Error de conexión. Por favor verifica tu internet',
  PAYMENT_ERROR: 'Error al procesar el pago. Por favor intenta de nuevo',
  ORDER_ERROR: 'Error al crear el pedido. Por favor intenta de nuevo',
  INVENTORY_ERROR: 'No hay suficiente inventario disponible',
} as const;

/**
 * Get user-friendly error message
 */
export function getUserFriendlyError(
  error: unknown,
  defaultMessage: string = ErrorMessages.INTERNAL_ERROR
): string {
  if (error instanceof Error) {
    // Map common error messages to user-friendly ones
    if (error.message.includes('rate limit')) {
      return ErrorMessages.RATE_LIMIT_EXCEEDED;
    }
    if (
      error.message.includes('unauthorized') ||
      error.message.includes('401')
    ) {
      return ErrorMessages.UNAUTHORIZED;
    }
    if (error.message.includes('not found') || error.message.includes('404')) {
      return ErrorMessages.NOT_FOUND;
    }
    if (error.message.includes('validation')) {
      return ErrorMessages.VALIDATION_ERROR;
    }
    if (
      error.message.includes('inventory') ||
      error.message.includes('stock')
    ) {
      return ErrorMessages.INVENTORY_ERROR;
    }

    // In development, show the actual error
    if (process.env.NODE_ENV === 'development') {
      return error.message;
    }
  }

  return defaultMessage;
}
