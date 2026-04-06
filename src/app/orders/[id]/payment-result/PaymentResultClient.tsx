/**
 * Client component for payment result page
 * Handles checking payment status and redirecting accordingly
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PickuMascot } from '../../../../components/ui/PickuMascot';

interface PaymentResultClientProps {
  order: {
    id: string;
    status: OrderStatus;
    totalAmount: number;
    restaurant: {
      id: string;
      name: string;
    };
    payment: {
      id: string;
      status: PaymentStatus;
      providerRef: string | null;
      declinedReason: string | null;
    } | null;
  };
  transactionId?: string;
  wompiStatus?: string;
}

export function PaymentResultClient({
  order,
  transactionId,
  wompiStatus,
}: PaymentResultClientProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<
    'approved' | 'declined' | 'pending' | 'error'
  >('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checkAttempts, setCheckAttempts] = useState(0);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const startTimeRef = useRef(Date.now());
  // Track transaction ID dynamically (can be updated from polling)
  const transactionIdRef = useRef<string | null>(
    transactionId || order.payment?.providerRef || null
  );

  const addLog = (msg: string) => {
    console.log(`[PaymentResult] ${msg}`);
    setDebugLog((prev) => [...prev.slice(-4), msg]); // Keep last 5 logs
  };

  useEffect(() => {
    const MAX_ATTEMPTS = 30; // Increased attempts
    const MAX_TIME = 120000; // 2 minutes max

    // Initial log
    addLog(
      `Init: Order=${order.id}, TxID=${transactionIdRef.current}, WompiStatus=${wompiStatus}`
    );

    // If we have status from Wompi query params, handle immediately
    if (wompiStatus) {
      if (
        wompiStatus === 'DECLINED' ||
        wompiStatus === 'ERROR' ||
        wompiStatus === 'VOIDED'
      ) {
        setPaymentStatus('declined');
        setIsChecking(false);
        setErrorMessage('El pago fue rechazado. Por favor intenta nuevamente.');
        return;
      }
    }

    // Check payment status
    const checkPaymentStatus = async (attempt: number = 0) => {
      try {
        const currentTxId = transactionIdRef.current;
        addLog(`Check #${attempt + 1}: TxID=${currentTxId || 'N/A'}`);

        // Check limits
        const elapsed = Date.now() - startTimeRef.current;
        if (elapsed > MAX_TIME || attempt >= MAX_ATTEMPTS) {
          addLog('Timeout/Max attempts reached');
          setPaymentStatus('pending');
          setIsChecking(false);
          setErrorMessage(
            'El pago está siendo procesado. Puede tardar unos minutos. Revisa tus pedidos en breve.'
          );
          return;
        }

        setCheckAttempts(attempt + 1);

        // STRATEGY 1: Verify directly with Wompi (via our backend)
        // We now send orderId and let the backend find the transaction
        // This fixes the issue on iPhone where transactionId is missing
        try {
          addLog(`Verifying with Backend (attempt ${attempt})...`);
          const verifyResponse = await fetch(
            '/api/payments/verify-transaction',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                transactionId: currentTxId, // Optional now
                orderId: order.id,
              }),
            }
          );

          if (verifyResponse.ok) {
            const verifyData = await verifyResponse.json();
            addLog(
              `Verify response: ${verifyData.success ? 'OK' : 'Fail'} Status=${verifyData.data?.status}`
            );
            if (verifyData.data) {
              addLog(
                `Debug: TxID=${verifyData.data.transactionId}, PaymentSourceID=${verifyData.data.paymentSourceId || 'NULL'}, Consent=${verifyData.data.consentToSave}`
              );
            }

            if (verifyData.success) {
              if (
                verifyData.data.orderStatus === 'paid' ||
                verifyData.data.status === 'approved'
              ) {
                setPaymentStatus('approved');
                setIsChecking(false);
                setTimeout(
                  () => router.push(`/orders/${order.id}/receipt`),
                  2000
                );
                return;
              }
              if (
                ['declined', 'voided', 'error'].includes(verifyData.data.status)
              ) {
                setPaymentStatus('declined');
                setIsChecking(false);
                setErrorMessage(verifyData.data.reason || 'Pago rechazado');
                return;
              }
            }
          }
        } catch (e) {
          addLog(`Verify error: ${e instanceof Error ? e.message : 'Unknown'}`);
        }

        // STRATEGY 2: Poll our backend for status updates (Webhooks)
        // This also helps us discover the Transaction ID if we didn't have it
        addLog(`Polling payment-status...`);
        const response = await fetch(
          `/api/orders/${order.id}/payment-status?t=${Date.now()}`,
          {
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              Pragma: 'no-cache',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const updatedOrder = data.data;

            // Update Transaction ID if discovered
            if (
              !transactionIdRef.current &&
              updatedOrder.payment?.providerRef
            ) {
              addLog(`Discovered TxID: ${updatedOrder.payment.providerRef}`);
              transactionIdRef.current = updatedOrder.payment.providerRef;
            }

            if (updatedOrder.status === 'paid') {
              addLog('Order is PAID');
              setPaymentStatus('approved');
              setIsChecking(false);
              setTimeout(
                () => router.push(`/orders/${order.id}/receipt`),
                2000
              );
              return;
            }
          }
        }

        // Continue polling
        const delay = attempt < 5 ? 2000 : 4000; // Faster at first
        setTimeout(() => checkPaymentStatus(attempt + 1), delay);
      } catch (error) {
        addLog(`Error: ${error instanceof Error ? error.message : 'Unknown'}`);
        setTimeout(() => checkPaymentStatus(attempt + 1), 3000);
      }
    };

    // Start polling
    checkPaymentStatus(0);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [order.id, wompiStatus, router]); // Removed transactionId from deps to use ref

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Format currency
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  if (isChecking) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
        <Loader2 className="mb-4 h-16 w-16 animate-spin text-primary-600" />
        <h2 className="mb-2 text-2xl font-bold text-gray-900">
          Verificando pago...
        </h2>
        <p className="mb-8 max-w-md text-gray-600">
          Estamos confirmando tu transacción con el banco. Por favor no cierres
          esta ventana.
        </p>

        <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
          <p>Intento {checkAttempts}...</p>
        </div>
      </div>
    );
  }

  // Pending state (after timeout or max attempts)
  if (paymentStatus === 'pending' && !isChecking) {
    return (
      <div className="mx-auto max-w-md">
        <div className="rounded-lg bg-white p-8 text-center shadow-md">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-yellow-600" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            Pago en proceso
          </h2>
          <p className="mt-2 text-gray-600">
            Tu pago está siendo procesado. Esto puede tardar unos minutos.
          </p>
          {errorMessage && (
            <div className="mt-4 rounded-lg bg-yellow-50 p-4">
              <p className="text-sm text-yellow-800">{errorMessage}</p>
            </div>
          )}
          <div className="mt-6 rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-600">
              Pedido #{order.id.slice(-8)}
            </p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {order.restaurant.name}
            </p>
            <p className="mt-2 text-xl font-bold text-blue-600">
              {formatCurrency(order.totalAmount)}
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={() => router.push(`/orders/${order.id}/receipt`)}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              Ver estado del pedido
            </button>
            <button
              onClick={() => router.push('/orders')}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
            >
              Ver mis pedidos
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'approved') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
        <div className="animate-bounce-slow mb-6">
          <PickuMascot
            variant="complete"
            size="3xl"
            className="mx-auto drop-shadow-2xl"
            showText={false}
          />
        </div>
        <h2 className="mb-2 text-3xl font-bold text-green-600">
          ¡Pago Exitoso!
        </h2>
        <p className="mb-8 text-gray-600">
          Tu pedido ha sido confirmado y está siendo preparado.
        </p>
        <p className="text-sm text-gray-500">Redirigiendo al recibo...</p>
      </div>
    );
  }

  if (paymentStatus === 'declined') {
    return (
      <div className="mx-auto max-w-md">
        <div className="rounded-lg bg-white p-8 text-center shadow-md">
          <XCircle className="mx-auto h-16 w-16 text-red-600" />
          <h2 className="mt-4 text-2xl font-bold text-gray-900">
            Pago rechazado
          </h2>
          {errorMessage && (
            <div className="mt-4 rounded-lg bg-red-50 p-4">
              <p className="text-sm text-red-800">{errorMessage}</p>
            </div>
          )}
          <p className="mt-4 text-gray-600">
            Tu pago no pudo ser procesado. Por favor intenta nuevamente.
          </p>
          <div className="mt-6 flex gap-4">
            <button
              onClick={() => router.push('/orders')}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
            >
              Ver mis pedidos
            </button>
            <button
              onClick={() => router.back()}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              Intentar nuevamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-lg bg-white p-8 text-center shadow-md">
        <AlertCircle className="mx-auto h-16 w-16 text-yellow-600" />
        <h2 className="mt-4 text-2xl font-bold text-gray-900">
          Error al verificar pago
        </h2>
        {errorMessage && (
          <div className="mt-4 rounded-lg bg-yellow-50 p-4">
            <p className="text-sm text-yellow-800">{errorMessage}</p>
          </div>
        )}
        <p className="mt-4 text-gray-600">
          No pudimos verificar el estado de tu pago. Por favor revisa tus
          pedidos o contacta soporte.
        </p>
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => router.push('/orders')}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
          >
            Ver mis pedidos
          </button>
          <button
            onClick={() => router.push(`/orders/${order.id}/receipt`)}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            Ver pedido
          </button>
        </div>
      </div>
    </div>
  );
}
