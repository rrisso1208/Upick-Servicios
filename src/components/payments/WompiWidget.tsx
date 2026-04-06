/**
 * Wompi Payment Widget Component
 * Uses the official Wompi widget with WidgetCheckout JavaScript API
 * Documentation: https://docs.wompi.co/docs/colombia/widget-checkout-web/
 *
 * This component uses the "Botón personalizado" method from Wompi docs:
 * 1. Include the widget script
 * 2. Configure WidgetCheckout with transaction data
 * 3. Call checkout.open() when button is clicked
 */

'use client';

import { useEffect, useRef, useState } from 'react';

interface WompiTransaction {
  id: string;
  status: string;
  reference: string;
  [key: string]: unknown;
}

interface WompiWidgetProps {
  amountInCents: number;
  reference: string;
  integritySignature: string;
  publicKey: string;
  redirectUrl?: string;
  onSuccess?: (transaction: WompiTransaction) => void;
  onError?: (error: string) => void;
  autoOpen?: boolean; // Auto-open widget when initialized
  collectPaymentSource?: boolean; // Enable tokenization
  acceptanceToken?: string; // Acceptance token for tokenization
  customerData?: {
    email?: string;
    fullName?: string;
    phoneNumber?: string;
    phoneNumberPrefix?: string;
    legalId?: string;
    legalIdType?: string;
  };
}

// Declare WidgetCheckout type based on Wompi documentation
declare global {
  interface Window {
    WidgetCheckout?: new (config: {
      currency: string;
      amountInCents: number;
      reference: string;
      publicKey: string;
      signature: { integrity: string };
      redirectUrl?: string;
      expirationTime?: string;
      collectPaymentSource?: boolean;
      collect_payment_source?: boolean; // Add snake_case variant
      acceptance_token?: string;
      taxInCents?: { vat?: number; consumption?: number };
      customerData?: {
        email?: string;
        fullName?: string;
        phoneNumber?: string;
        phoneNumberPrefix?: string;
        legalId?: string;
        legalIdType?: string;
      };
      shippingAddress?: {
        addressLine1?: string;
        addressLine2?: string;
        city?: string;
        country?: string;
        phoneNumber?: string;
        region?: string;
        name?: string;
      };
    }) => {
      open: (
        callback: (result: { transaction: WompiTransaction }) => void
      ) => void;
    };
  }
}

export function WompiWidget({
                              amountInCents,
                              reference,
                              integritySignature,
                              publicKey,
                              redirectUrl,
                              onSuccess,
                              onError,
                              autoOpen = false,
                              collectPaymentSource = false,
                              acceptanceToken,
                              customerData,
                            }: WompiWidgetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const checkoutInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Validate required props
    if (!publicKey || !integritySignature || !reference || !amountInCents) {
      console.error('WompiWidget: Missing required props', {
        hasPublicKey: !!publicKey,
        publicKeyValue: publicKey
          ? `${publicKey.substring(0, 20)}...`
          : 'undefined',
        hasIntegritySignature: !!integritySignature,
        hasReference: !!reference,
        amountInCents,
        envPublicKey: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY
          ? 'exists'
          : 'missing',
      });
      onError?.(
        publicKey
          ? 'Faltan datos necesarios para inicializar el pago'
          : 'Error de configuración: La clave pública de Wompi no está configurada. Por favor contacta al administrador.'
      );
      return;
    }

    const cleanPublicKey = publicKey.trim();

    // Remove stale Wompi scripts that were loaded without the correct public key
    const wompiScripts = Array.from(
      document.querySelectorAll('script[src*="wompi.co"]')
    ) as HTMLScriptElement[];
    for (const script of wompiScripts) {
      const src = script.getAttribute('src') || '';
      const scriptKey = script.getAttribute('data-public-key');
      const isWidgetScript = src.includes('checkout.wompi.co/widget.js');
      const isApiScript =
        src.includes('api.wompi.co/v1.js') ||
        src.includes('api-sandbox.wompi.co/v1.js');
      if ((isWidgetScript && scriptKey !== cleanPublicKey) || isApiScript) {
        script.remove();
      }
    }

    // Check if script is already loaded
    const existingScript = document.querySelector(
      'script[src="https://checkout.wompi.co/widget.js"]'
    ) as HTMLScriptElement | null;

    if (existingScript) {
      const existingKey = existingScript.getAttribute('data-public-key');
      // If script was loaded without key or with a different key, reload it
      if (existingKey !== cleanPublicKey) {
        existingScript.remove();
        (window as any).WidgetCheckout = undefined;
      } else {
        // Ensure public key is available for the script even if it was loaded earlier
        existingScript.setAttribute('data-public-key', cleanPublicKey);
        (window as any).__WOMPI_PUBLIC_KEY__ = cleanPublicKey;
        (window as any).WOMPI_PUBLIC_KEY = cleanPublicKey;
        (window as any).wompiPublicKey = cleanPublicKey;

        // Script exists, wait a bit for WidgetCheckout to be available
        const checkWidget = setInterval(() => {
          if (window.WidgetCheckout) {
            clearInterval(checkWidget);
            setScriptLoaded(true);
            initializeCheckout();
          }
        }, 100);

        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkWidget);
          if (!window.WidgetCheckout) {
            onError?.(
              'Widget de Wompi no disponible después de cargar el script'
            );
          }
        }, 5000);

        return () => clearInterval(checkWidget);
      }
    }

    // Validate publicKey before loading script
    if (!publicKey || publicKey.trim() === '' || publicKey === 'undefined') {
      console.error(
        'Cannot load Wompi script: publicKey is missing or invalid',
        {
          publicKey,
          publicKeyType: typeof publicKey,
        }
      );
      onError?.(
        'Error de configuración: La clave pública de Wompi no está configurada.'
      );
      return;
    }

    // Make publicKey available globally for Wompi script (before loading)
    // This prevents the "merchants/undefined" error
    if (typeof window !== 'undefined') {
      (window as any).__WOMPI_PUBLIC_KEY__ = cleanPublicKey;
      (window as any).WOMPI_PUBLIC_KEY = cleanPublicKey;
      (window as any).wompiPublicKey = cleanPublicKey;
    }

    // Load the Wompi widget script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://checkout.wompi.co/widget.js';
    script.async = true;
    // Add data-public-key to help widget initialization/fallback
    script.setAttribute('data-public-key', cleanPublicKey);
    script.onerror = () => {
      onError?.(
        'Error al cargar el widget de Wompi. Por favor recarga la página.'
      );
    };
    script.onload = () => {
      // Wait for WidgetCheckout to be available
      const checkWidget = setInterval(() => {
        if (window.WidgetCheckout) {
          clearInterval(checkWidget);
          setScriptLoaded(true);
          initializeCheckout();
        }
      }, 100);

      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkWidget);
        if (!window.WidgetCheckout) {
          onError?.(
            'Widget de Wompi no disponible después de cargar el script'
          );
        }
      }, 5000);
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, [
    amountInCents,
    reference,
    integritySignature,
    publicKey,
    redirectUrl,
    onError,
    autoOpen,
    autoOpen,
    collectPaymentSource,
    acceptanceToken,
    customerData,
  ]);

  const initializeCheckout = () => {
    if (typeof window === 'undefined' || !window.WidgetCheckout) {
      console.error('WidgetCheckout not available');
      onError?.('Widget de Wompi no disponible');
      return;
    }

    // Validate publicKey is not undefined or empty
    if (!publicKey || publicKey.trim() === '' || publicKey === 'undefined') {
      console.error(
        'Missing or invalid publicKey for checkout initialization',
        {
          publicKey,
          publicKeyType: typeof publicKey,
          envPublicKey: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY,
        }
      );
      onError?.(
        'Error de configuración: La clave pública de Wompi no está configurada. Por favor contacta al administrador.'
      );
      return;
    }

    if (!integritySignature || !reference || !amountInCents) {
      console.error('Missing required props for checkout initialization', {
        hasIntegritySignature: !!integritySignature,
        hasReference: !!reference,
        amountInCents,
      });
      onError?.('Faltan datos necesarios para inicializar el pago');
      return;
    }

    try {
      // Sanitize inputs
      const cleanPublicKey = publicKey.trim();

      // Additional validation for public key format
      if (
        !cleanPublicKey.startsWith('pub_test_') &&
        !cleanPublicKey.startsWith('pub_prod_')
      ) {
        console.error('Invalid public key format', {
          publicKey: cleanPublicKey.substring(0, 20) + '...',
        });
        onError?.(
          'Error de configuración: La clave pública de Wompi tiene un formato inválido.'
        );
        return;
      }

      const cleanSignature = integritySignature.trim();
      const cleanReference = reference.trim();

      // Initialize WidgetCheckout according to Wompi documentation
      const sanitizedCustomerData = customerData
        ? Object.fromEntries(
            Object.entries(customerData).filter(
              ([, value]) =>
                value !== undefined && value !== null && value !== ''
            )
          )
        : undefined;
      
      const widgetConfig = {
        currency: 'COP',
        amountInCents,
        reference: cleanReference,
        publicKey: cleanPublicKey,
        signature: {
          integrity: cleanSignature,
        },
        redirectUrl:
          redirectUrl ||
          (typeof window !== 'undefined'
            ? `${window.location.origin}/orders/${cleanReference}/payment-result`
            : undefined),
        collectPaymentSource: collectPaymentSource,
        collect_payment_source: collectPaymentSource, // Add snake_case variant back (might be required for checkbox)
        // Pass acceptance token if provided (required for tokenization)
        ...(acceptanceToken && {
          acceptance_token: acceptanceToken,
        }),
        ...(sanitizedCustomerData &&
          Object.keys(sanitizedCustomerData).length > 0 && {
            customerData: sanitizedCustomerData,
        }),
      };

      // Always log for debugging tokenization issues
      console.log('🔧 Initializing Wompi Widget with config:', {
        ...widgetConfig,
        publicKey: cleanPublicKey.substring(0, 20) + '...',
        signature: cleanSignature.substring(0, 20) + '...',
        acceptance_token: acceptanceToken
          ? acceptanceToken.substring(0, 20) + '...'
          : '❌ MISSING',
        collectPaymentSource,
        collect_payment_source: collectPaymentSource,
        willTokenize: collectPaymentSource && !!acceptanceToken,
      });

      // CRITICAL: Log warning if collectPaymentSource is true but acceptanceToken is missing
      if (collectPaymentSource && !acceptanceToken) {
        console.warn(
          '⚠️ WARNING: collectPaymentSource is true but acceptanceToken is missing!',
          'Payment method will NOT be saved without acceptanceToken.'
        );
      }

      // Delay initialization slightly to ensure script is fully ready
      setTimeout(() => {
        try {
          if (!window.WidgetCheckout) {
            console.error('WidgetCheckout lost during delay');
            return;
          }
          checkoutInstanceRef.current = new window.WidgetCheckout(widgetConfig);
          setIsInitialized(true);
          // Always log for debugging tokenization issues
          console.log('✅ WompiWidget initialized successfully', {
            reference: cleanReference,
            amountInCents,
            hasPublicKey: !!cleanPublicKey,
            publicKeyPrefix: cleanPublicKey.substring(0, 10) + '...',
            hasSignature: !!cleanSignature,
            hasAcceptanceToken: !!acceptanceToken,
            acceptanceTokenPrefix: acceptanceToken
              ? acceptanceToken.substring(0, 20) + '...'
              : '❌ MISSING',
            collectPaymentSource,
            collect_payment_source: collectPaymentSource,
            willTokenize: collectPaymentSource && !!acceptanceToken,
            autoOpen,
            // CRITICAL: Log if tokenization will work
            ...(collectPaymentSource && !acceptanceToken
              ? {
                '⚠️ WARNING':
                  'Tokenization will NOT work - acceptanceToken is missing!',
              }
              : {}),
            ...(collectPaymentSource && acceptanceToken
              ? {
                '✅ Tokenization': 'Ready - payment method will be saved',
              }
              : {}),
          });

          // Auto-open widget if requested
          if (autoOpen) {
            setTimeout(() => {
              if (checkoutInstanceRef.current) {
                console.log('Auto-opening Wompi widget...');
                handlePayment();
              } else {
                console.error(
                  'Cannot auto-open: checkoutInstanceRef.current is null'
                );
                onError?.(
                  'Error al inicializar el widget. Por favor recarga la página.'
                );
              }
            }, 500);
          }
        } catch (err) {
          console.error('Error inside initialization timeout:', err);
          onError?.('Error interno al inicializar Wompi');
        }
      }, 200);
    } catch (error: any) {
      console.error('Error initializing WompiWidget:', error);

      let errorMessage = 'Error al inicializar el widget de Wompi';

      if (error instanceof Error) {
        errorMessage = error.message;

        // Handle specific DOMException from Wompi script (often due to invalid public key format)
        if (
          errorMessage.includes('The string did not match the expected pattern')
        ) {
          errorMessage =
            'Error de configuración: La llave pública de Wompi tiene un formato inválido. Verifica que no tenga espacios extra.';
        }
      }

      onError?.(errorMessage);
      setIsInitialized(false);
    }
  };

  const handlePayment = () => {
    if (!checkoutInstanceRef.current) {
      console.error(
        'handlePayment called but checkoutInstanceRef.current is null'
      );
      onError?.(
        'Widget de Wompi no inicializado. Por favor recarga la página.'
      );
      return;
    }

    setIsLoading(true);
    console.log('Opening Wompi widget...', {
      reference,
      amountInCents,
      hasInstance: !!checkoutInstanceRef.current,
    });

    try {
      // Open widget with callback according to Wompi docs
      // The callback receives result.transaction when payment completes
      checkoutInstanceRef.current.open(
        (result: { transaction?: WompiTransaction }) => {
          console.log('[WompiWidget] Callback received:', result);
          setIsLoading(false);

          try {
            // According to Wompi docs, result.transaction contains transaction info
            if (result && result.transaction) {
              const transaction = result.transaction;
              console.log('[WompiWidget] Transaction completed:', transaction);

              // IMPORTANT: Always redirect to payment-result page
              // The payment-result page will poll and wait for webhook to process
              // This ensures we don't miss the payment status even if callback is delayed
              if (redirectUrl) {
                // Add transaction info to URL for initial status check
                const url = new URL(redirectUrl, window.location.origin);
                url.searchParams.set('transaction_id', transaction.id);
                url.searchParams.set('status', transaction.status);
                console.log('[WompiWidget] Redirecting to:', url.toString());
                window.location.href = url.toString();
              } else {
                // Fallback: redirect to payment result without params
                const fallbackUrl = `/orders/${reference}/payment-result`;
                console.log(
                  '[WompiWidget] Redirecting to fallback:',
                  fallbackUrl
                );
                window.location.href = fallbackUrl;
              }

              // Call onSuccess callback if provided (but don't wait for it)
              if (transaction.status === 'APPROVED') {
                onSuccess?.(transaction);
              } else if (
                transaction.status === 'DECLINED' ||
                transaction.status === 'ERROR' ||
                transaction.status === 'VOIDED'
              ) {
                // Transaction failed - onError will be handled by payment-result page
                const statusMessage =
                  typeof transaction.statusMessage === 'string'
                    ? transaction.statusMessage
                    : `El pago fue ${
                      transaction.status === 'DECLINED'
                        ? 'rechazado'
                        : transaction.status === 'ERROR'
                          ? 'rechazado con error'
                          : 'anulado'
                    }`;
                onError?.(statusMessage);
              }
            } else {
              // Widget might redirect instead of calling callback
              // In that case, redirect to payment-result page to check status
              console.log(
                '[WompiWidget] No transaction in callback, redirecting to check status'
              );
              if (redirectUrl) {
                window.location.href = redirectUrl;
              } else {
                const fallbackUrl = `/orders/${reference}/payment-result`;
                window.location.href = fallbackUrl;
              }
            }
          } catch (error) {
            console.error('[WompiWidget] Error in callback:', error);
            // Still redirect to payment-result page to check status
            if (redirectUrl) {
              window.location.href = redirectUrl;
            } else {
              const fallbackUrl = `/orders/${reference}/payment-result`;
              window.location.href = fallbackUrl;
            }
          }
        }
      );
    } catch (error) {
      console.error('Error opening Wompi widget:', error);
      setIsLoading(false);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error al abrir el widget de pago';
      onError?.(errorMessage);
    }
  };

  return (
    <div className="w-full">
      {/* Custom button that opens the Wompi widget */}
      <button
        type="button"
        onClick={handlePayment}
        disabled={isLoading || !isInitialized || !checkoutInstanceRef.current}
        className="w-full rounded-md bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:bg-primary-700 hover:shadow-xl disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-50"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="h-5 w-5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Procesando...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            Paga con Wompi
          </span>
        )}
      </button>

      <p className="mt-2 text-center text-xs text-gray-500">
        Pago seguro procesado por Wompi. No almacenamos información de tu
        tarjeta.
      </p>

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 rounded bg-gray-100 p-2 text-xs text-gray-600">
          <p>Script cargado: {scriptLoaded ? '✅' : '❌'}</p>
          <p>Inicializado: {isInitialized ? '✅' : '❌'}</p>
          <p>Instancia: {checkoutInstanceRef.current ? '✅' : '❌'}</p>
          <p>Public Key: {publicKey ? '✅' : '❌'}</p>
          <p>Integrity Signature: {integritySignature ? '✅' : '❌'}</p>
        </div>
      )}
    </div>
  );
}
