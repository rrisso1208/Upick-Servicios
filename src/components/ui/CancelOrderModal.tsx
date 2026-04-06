/**
 * Cancel Order Modal Component
 */

'use client';

import { useState } from 'react';
import { X, AlertCircle, Loader2, CreditCard, Wallet, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { supabase } from '../../providers/AuthProvider';
import { addHours, isBefore } from 'date-fns';
import { useRouter } from 'next/navigation';

interface CancelOrderModalProps {
  order: {
    id: string;
    pickupCode: string;
    totalAmount: number;
    pickupSlotStart: Date | string;
    status: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onCancelSuccess: () => void;
}

export function CancelOrderModal({
  order,
  isOpen,
  onClose,
  onCancelSuccess,
}: CancelOrderModalProps) {
  const router = useRouter();
  const [refundType, setRefundType] = useState<
    'REFUND_TO_PAYMENT_METHOD' | 'CONVERT_TO_CREDITS' | null
  >(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [caseNumber, setCaseNumber] = useState<string | null>(null);

  if (!isOpen) return null;

  // CRITICAL: Check if order can be cancelled
  // Only paid orders can be cancelled (awaiting_payment and payment_failed cannot be cancelled)
  const canCancelOrder =
    order.status !== 'awaiting_payment' &&
    order.status !== 'payment_failed' &&
    order.status !== 'cancelled' &&
    order.status !== 'refunded' &&
    order.status !== 'delivered';

  // Check if order can be cancelled (at least 1 hour before pickup)
  const now = new Date();
  const pickupTime = new Date(order.pickupSlotStart);
  const oneHourBeforePickup = addHours(pickupTime, -1);
  const canCancel = canCancelOrder && isBefore(now, oneHourBeforePickup);

  const handleCancel = async () => {
    if (!refundType) {
      setError('Por favor selecciona un tipo de reembolso');
      return;
    }

    // Show confirmation dialog
    if (!showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get session token
      // First call getUser() to ensure the session is valid and refreshed
      const { error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.error('Error validating session:', authError);
        setError('Tu sesión ha expirado. Por favor recarga la página e inicia sesión nuevamente.');
        setLoading(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError('Debes iniciar sesión para cancelar el pedido');
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          refundType,
          reason: reason.trim() || null,
        }),
      });

      // Check if response is ok and has content
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: 'Error al cancelar el pedido' };
        }
        setError(
          errorData.error || `Error ${response.status}: ${response.statusText}`
        );
        setLoading(false);
        return;
      }

      // Parse JSON response
      let data;
      try {
        const responseText = await response.text();
        if (!responseText || responseText.trim() === '') {
          throw new Error('Empty response from server');
        }
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        setError(
          'Error al procesar la respuesta del servidor. Por favor intenta de nuevo.'
        );
        setLoading(false);
        return;
      }

      if (!data.success) {
        setError(data.error || 'Error al cancelar el pedido');
        setLoading(false);
        return;
      }

      // Success - check if case was created
      const orderStatus = data.data?.orderStatus;
      const returnedCaseNumber = data.data?.caseNumber;
      
      console.log('[CancelOrderModal] Cancellation successful:', {
        orderId: order.id,
        pickupCode: order.pickupCode,
        refundType,
        orderStatus,
        caseNumber: returnedCaseNumber,
        fullResponse: data.data,
      });

      // Call success callback first to refresh orders
      onCancelSuccess();

      // If case was created, show case modal
      if (refundType === 'REFUND_TO_PAYMENT_METHOD' && returnedCaseNumber) {
        setCaseNumber(returnedCaseNumber);
        setShowCaseModal(true);
        setShowConfirmation(false);
      } else {
        // Close modal and show success message
        onClose();
        const message = data.data?.message || 'Pedido cancelado exitosamente';
        alert(message);
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      setError('Error al cancelar el pedido. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div className="flex h-full w-full items-end justify-center sm:items-center sm:p-4">
        <div
          className="relative w-full bg-white shadow-xl
                   h-[95vh] sm:h-auto sm:max-h-[90vh]
                   sm:max-w-md
                   rounded-t-2xl sm:rounded-2xl
                   overflow-y-auto"
        >
          {/* Header (ya NO fijo) */}
          <div className="border-b border-gray-200 px-4 py-4 sm:px-6 sm:py-6 sm:pb-4">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 active:scale-95 sm:right-4 sm:top-4"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="pr-10 text-base font-bold text-gray-900 sm:text-xl">
              Cancelar Pedido #{order.pickupCode}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Monto total: {formatCurrency(order.totalAmount)}
            </p>
          </div>

          {/* Content (todo dentro del mismo scroll) */}
          <div className="px-4 pt-4 pb-24 sm:px-6 sm:py-5">

          {!canCancel && (
              <div className="mb-4 rounded-xl bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-red-900 break-words">
                      No se puede cancelar este pedido
                    </p>
                    <p className="mt-1 text-sm text-red-700 break-words">
                      Debes cancelar al menos 1 hora antes de la hora de entrega.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {canCancel && !showConfirmation && !showCaseModal && (
              <>
                <div className="mb-4">
                  <p className="mb-3 text-sm font-medium text-gray-700">
                    Selecciona el tipo de reembolso:
                  </p>

                  <div className="space-y-3">
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors
                    ${
                        refundType === 'REFUND_TO_PAYMENT_METHOD'
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-200 hover:border-primary-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="refundType"
                        value="REFUND_TO_PAYMENT_METHOD"
                        checked={refundType === 'REFUND_TO_PAYMENT_METHOD'}
                        onChange={() => setRefundType('REFUND_TO_PAYMENT_METHOD')}
                        className="mt-1 h-4 w-4 text-primary-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CreditCard className="h-5 w-5 text-gray-600 shrink-0" />
                          <span className="font-medium text-gray-900 break-words">
                          Reembolso al método de pago original
                        </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600 break-words">
                          El dinero puede tardar hasta 15 días hábiles en devolverse
                          a tu método de pago original.
                        </p>

                        {refundType === 'REFUND_TO_PAYMENT_METHOD' && (
                          <div className="mt-2 rounded-xl bg-blue-50 p-3">
                            <p className="text-sm font-medium text-blue-900 break-words">
                              ℹ️ Se creará un caso para gestionar tu solicitud de reembolso
                            </p>
                            <p className="mt-1 text-xs text-blue-700 break-words">
                              Podrás hacer seguimiento del caso y comunicarte con
                              nuestro equipo de soporte a través del chat.
                            </p>
                          </div>
                        )}
                      </div>
                    </label>

                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors
                    ${
                        refundType === 'CONVERT_TO_CREDITS'
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-200 hover:border-primary-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="refundType"
                        value="CONVERT_TO_CREDITS"
                        checked={refundType === 'CONVERT_TO_CREDITS'}
                        onChange={() => setRefundType('CONVERT_TO_CREDITS')}
                        className="mt-1 h-4 w-4 text-primary-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Wallet className="h-5 w-5 text-primary-600 shrink-0" />
                          <span className="font-medium text-gray-900 break-words">
                          Convertir a créditos del sistema
                        </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600 break-words">
                          Los créditos se agregarán instantáneamente a tu cuenta y
                          podrás usarlos para comprar en cualquier restaurante.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Razón de cancelación (opcional)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="¿Por qué cancelas este pedido?"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 h-24 resize-none"
                    maxLength={500}
                  />
                </div>

                {error && (
                  <div className="mb-4 rounded-xl bg-red-50 p-3">
                    <p className="text-sm text-red-700 break-words">{error}</p>
                  </div>
                )}

                {/* Botones (ya NO fijos) */}
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="btn-secondary w-full sm:flex-1"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={loading || !refundType}
                    className="
                      relative w-full sm:flex-1
                      rounded-xl
                      bg-red-600
                      px-4 py-3
                      text-sm font-semibold text-white
                      shadow-sm
                      transition-all
                      hover:bg-red-700
                      active:scale-[0.98]
                      disabled:cursor-not-allowed
                      disabled:bg-red-300
                      disabled:text-white/80
                      focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
                    "
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cancelando...
                      </span>
                    ) : (
                      'Continuar'
                    )}
                  </button>
                </div>
              </>
            )}

            {showConfirmation && (
              <>
                <div className="space-y-4">
                  <div className="rounded-xl bg-yellow-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-yellow-900 break-words">
                          ¿Realmente quieres cancelar el pedido?
                        </p>
                        {refundType === 'REFUND_TO_PAYMENT_METHOD' && (
                          <p className="mt-2 text-sm text-yellow-700 break-words">
                            Se creará un caso para gestionar tu solicitud de reembolso al método de pago original.
                            El proceso puede tardar hasta 15 días hábiles.
                          </p>
                        )}
                        {refundType === 'CONVERT_TO_CREDITS' && (
                          <p className="mt-2 text-sm text-yellow-700 break-words">
                            Los créditos se agregarán instantáneamente a tu cuenta.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botones confirmación (ya NO fijos) */}
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowConfirmation(false);
                      setError(null);
                    }}
                    disabled={loading}
                    className="btn-secondary w-full sm:flex-1"
                  >
                    No, mantener pedido
                  </button>

                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={loading}
                    className="
                      w-full sm:flex-1
                      flex items-center justify-center gap-2
                      rounded-xl
                      bg-red-600 text-white
                      px-4 py-3
                      text-sm font-semibold
                      shadow-md
                      transition-all
                      hover:bg-red-700
                      active:scale-95
                      disabled:opacity-60 disabled:cursor-not-allowed
                    "
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cancelando…
                      </>
                    ) : (
                      'Sí, cancelar pedido'
                    )}
                  </button>
                </div>
              </>
            )}

            {showCaseModal && caseNumber && (
              <>
                <div className="space-y-4">
                  <div className="rounded-xl bg-green-50 p-6 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-green-900">
                      Caso Creado Exitosamente
                    </h3>
                    <p className="mt-2 text-sm text-green-700">
                      Tu solicitud de reembolso ha sido registrada
                    </p>
                    <div className="mt-4 rounded-xl bg-white p-4">
                      <p className="text-sm font-medium text-gray-600">Número de Caso</p>
                      <p className="mt-2 font-mono text-2xl font-bold text-gray-900">
                        {caseNumber}
                      </p>
                    </div>
                    <p className="mt-4 text-sm text-green-700 break-words">
                      Puedes hacer seguimiento de tu caso y comunicarte con nuestro equipo de soporte a través del chat.
                    </p>
                  </div>
                </div>

                {/* Botones caso creado (ya NO fijos) */}
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCaseModal(false);
                      onClose();
                    }}
                    className="btn-secondary w-full sm:flex-1"
                  >
                    Cerrar
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowCaseModal(false);
                      onClose();
                      router.push('/cases');
                    }}
                    className="btn-primary w-full sm:flex-1"
                  >
                    Ir al Caso
                  </button>
                </div>
              </>
            )}

            {/* Un poquito de espacio final para que no quede pegado al borde */}
            <div className="h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
