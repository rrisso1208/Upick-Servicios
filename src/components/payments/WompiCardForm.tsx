/**
 * Wompi Card Payment Form Component
 * Uses Wompi widget for secure card tokenization
 */

'use client';

import { useEffect, useRef, useState } from 'react';

// Simple logger for client-side
const logger = {
  info: (data: any, message: string) => {
    if (
      typeof window !== 'undefined' &&
      process.env.NODE_ENV === 'development'
    ) {
      console.log(`[WompiWidget] ${message}`, data);
    }
  },
};
// Get Wompi public key from environment
const getWompiPublicKey = () => {
  if (typeof window !== 'undefined') {
    return (
      process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY ||
      (window as any).__WOMPI_PUBLIC_KEY__ ||
      ''
    );
  }
  return '';
};

interface WompiCardFormProps {
  amountInCents: number;
  reference: string;
  integritySignature: string; // Integrity signature from server
  onTokenReceived?: (token: string, installments: number) => void; // Optional, widget handles payment
  onError: (error: string) => void;
  onTransactionComplete?: (transaction: any) => void; // Callback when transaction completes
}

export function WompiCardForm({
  amountInCents,
  reference,
  integritySignature,
  onError,
  onTransactionComplete,
}: WompiCardFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [installments, setInstallments] = useState(1);
  const widgetInitialized = useRef(false);
  const checkoutInstance = useRef<any>(null);

  useEffect(() => {
    // Load Wompi widget script according to official docs
    // https://docs.wompi.co/docs/colombia/widget-checkout-web/
    if (
      typeof window !== 'undefined' &&
      !window.WidgetCheckout &&
      !widgetInitialized.current
    ) {
      const script = document.createElement('script');
      script.src = 'https://checkout.wompi.co/widget.js';
      script.async = true;
      script.onload = () => {
        initializeWidget();
      };
      script.onerror = () => {
        onError(
          'Error al cargar el widget de Wompi. Por favor recarga la página.'
        );
      };
      document.head.appendChild(script);
      widgetInitialized.current = true;
    } else if (window.WidgetCheckout && !widgetInitialized.current) {
      initializeWidget();
      widgetInitialized.current = true;
    }

    return () => {
      // Cleanup if needed
    };
  }, [integritySignature, reference, amountInCents]);

  const initializeWidget = () => {
    if (!window.WidgetCheckout) {
      onError('Widget de Wompi no disponible');
      return;
    }

    try {
      // Initialize WidgetCheckout according to official Wompi documentation
      const publicKey = getWompiPublicKey();
      if (!publicKey) {
        onError(
          'La clave pública de Wompi no está configurada. Por favor contacta al administrador.'
        );
        return;
      }
      checkoutInstance.current = new window.WidgetCheckout({
        currency: 'COP',
        amountInCents,
        reference,
        publicKey: publicKey,
        signature: {
          integrity: integritySignature,
        },
        redirectUrl: `${window.location.origin}/orders/${reference}/payment-result`,
      });
    } catch (error: any) {
      setIsLoading(false);
      onError(error.message || 'Error al inicializar el widget de Wompi');
    }
  };

  const handleOpenWidget = () => {
    if (!checkoutInstance.current) {
      onError('Widget de Wompi no disponible. Por favor recarga la página.');
      return;
    }

    setIsLoading(true);
    try {
      // Open widget with callback according to Wompi docs
      checkoutInstance.current.open((result: any) => {
        setIsLoading(false);
        if (result.transaction) {
          // If transaction is completed, notify parent component
          const transaction = result.transaction;
          logger.info({ transaction }, 'Wompi widget transaction completed');

          // Call transaction complete callback if provided
          if (onTransactionComplete) {
            onTransactionComplete(transaction);
          } else {
            // Fallback: redirect to payment result page
            window.location.href = `${window.location.origin}/orders/${reference}/payment-result`;
          }
        } else {
          onError('No se recibió información de la transacción');
        }
      });
    } catch (error: any) {
      setIsLoading(false);
      onError(error.message || 'Error al abrir el formulario de pago');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Número de cuotas
        </label>
        <select
          value={installments}
          onChange={(e) => setInstallments(Number(e.target.value))}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          disabled={isLoading}
        >
          {[1, 2, 3, 6, 12, 18, 24].map((num) => (
            <option key={num} value={num}>
              {num} {num === 1 ? 'cuota' : 'cuotas'}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={handleOpenWidget}
        disabled={isLoading || !window.WidgetCheckout}
        className="w-full rounded-md bg-primary-600 px-4 py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {isLoading ? 'Procesando...' : 'Ingresar datos de tarjeta'}
      </button>

      <p className="text-center text-xs text-gray-500">
        Tus datos están protegidos por Wompi. No almacenamos información de tu
        tarjeta.
      </p>
    </div>
  );
}
