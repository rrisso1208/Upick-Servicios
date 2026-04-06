/**
 * Client component for order receipt with realtime status updates
 */

'use client';

import { useEffect, useState } from 'react';
import { OrderReceipt } from '../../../../components/ui/OrderReceipt';
import { ReviewForm } from '../../../../components/ui/ReviewForm';
import { PickuMascot } from '../../../../components/ui/PickuMascot';
import { useRealtimeOrderStatus } from '../../../../hooks/useRealtimeOrderStatus';
import { OrderStatus } from '@prisma/client';
import { Star, CheckCircle, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../providers/AuthProvider';

interface OrderReceiptClientProps {
  order: {
    id: string;
    pickupCode: string;
    pickupSlotStart: Date | string;
    pickupSlotEnd: Date | string;
    totalAmount: number;
    discountAmount?: number;
    status: OrderStatus;
    restaurant: {
      id: string;
      name: string;
      location?: string | null;
    };
    coupon?: {
      code: string;
      discountType: string;
      discountValue: number;
    } | null;
    items: Array<{
      quantity: number;
      product: {
        id: string;
        name: string;
        price: number;
        promotionPrice?: number | null;
      };
      unitPrice: number;
      notes?: string | null;
      options?: Array<{
        priceDelta: number;
        productOption: {
          name: string;
          group: {
            name: string;
          };
        };
      }>;
    }>;
    review?: {
      id: string;
      rating: number;
    } | null;
  };
}

export function OrderReceiptClient({ order }: OrderReceiptClientProps) {
  const router = useRouter();
  const { status: realtimeStatus, lastUpdate } = useRealtimeOrderStatus(
    order.id
  );
  const { user, loading: authLoading, refreshSession } = useAuth();
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Refresh session when component mounts or when returning from login
  useEffect(() => {
    // Check if we're returning from login (URL might have hash or query params)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('redirect') || window.location.hash) {
      // Refresh session to ensure we have the latest auth state
      refreshSession();
    }
  }, [refreshSession]);

  const currentStatus = realtimeStatus || order.status;
  const hasReview = !!order.review;
  const canReview =
    currentStatus === 'delivered' && !hasReview && !reviewSubmitted;

  const statusLabels: Record<OrderStatus, { label: string; color: string }> = {
    awaiting_payment: {
      label: 'Esperando pago',
      color: 'bg-yellow-100 text-yellow-800',
    },
    payment_failed: {
      label: 'Pago fallido',
      color: 'bg-red-100 text-red-800',
    },
    paid: { label: 'Pagado - En cola', color: 'bg-blue-100 text-blue-800' },
    in_progress: {
      label: '👨‍🍳 En preparación',
      color: 'bg-yellow-100 text-yellow-800',
    },
    ready: {
      label: '✅ Listo para recoger',
      color: 'bg-green-100 text-green-800',
    },
    delivered: { label: 'Entregado', color: 'bg-gray-100 text-gray-800' },
    cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
    refunded: { label: 'Reembolsado', color: 'bg-red-100 text-red-800' },
  };

  const statusInfo = statusLabels[currentStatus];

  const handleLogin = () => {
    const currentPath = `/orders/${order.id}/receipt`;
    router.push(`/auth/login?redirect=${encodeURIComponent(currentPath)}`);
  };

  const handlePrint = () => {
    window.open(`/orders/${order.id}/print`, '_blank');
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Status Banner */}
      <div className={`card ${statusInfo.color} border-l-4 border-current`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Estado del pedido:</p>
            <p className="mt-1 text-2xl font-bold">{statusInfo.label}</p>
            {lastUpdate && (
              <p className="mt-1 text-xs opacity-75">
                Actualizado: {lastUpdate.toLocaleTimeString('es-CO')}
              </p>
            )}
          </div>

          {currentStatus === 'ready' && (
            <div className="animate-bounce">
              <span className="text-4xl">🔔</span>
            </div>
          )}
        </div>

        {/* Picku Mascot based on order status */}
        {currentStatus === 'paid' && (
          <div className="mt-3 rounded-lg bg-white p-4">
            <div className="flex items-center gap-4">
              <PickuMascot variant="paid" size="lg" />
              <div className="flex-1">
                <p className="font-semibold text-blue-800">
                  ¡Pago recibido! Tu pedido está en cola.
                </p>
                <p className="mt-1 text-sm text-blue-700">
                  Picku está organizando tu pedido 🎉
                </p>
              </div>
            </div>
          </div>
        )}

        {currentStatus === 'in_progress' && (
          <div className="mt-3 rounded-lg bg-white p-4">
            <div className="flex items-center gap-4">
              <PickuMascot variant="in_progress" size="lg" />
              <div className="flex-1">
                <p className="font-semibold text-yellow-800">
                  👨‍🍳 Tu pedido está en preparación
                </p>
                <p className="mt-1 text-sm text-yellow-700">
                  Picku está cocinando tu pedido con mucho cariño
                </p>
              </div>
            </div>
          </div>
        )}

        {currentStatus === 'ready' && (
          <div className="mt-3 rounded-lg bg-white p-4">
            <div className="flex items-center gap-4">
              <PickuMascot variant="ready" size="lg" />
              <div className="flex-1">
                <p className="font-semibold text-green-800">
                  ¡Tu pedido está listo! Dirígete al restaurante.
                </p>
                <p className="mt-1 text-sm text-green-700">
                  Picku te espera con tu pedido 🎉
                </p>
              </div>
            </div>
          </div>
        )}

        {currentStatus === 'delivered' && (
          <div className="mt-3 rounded-lg bg-white p-4">
            <div className="flex items-center gap-4">
              <PickuMascot variant="delivered" size="lg" />
              <div className="flex-1">
                <p className="font-semibold text-gray-800">
                  ¡Pedido entregado!
                </p>
                <p className="mt-1 text-sm text-gray-700">
                  Picku espera verte pronto. ¡Gracias por tu pedido! 🎉
                </p>
              </div>
            </div>
          </div>
        )}

        {(currentStatus === 'cancelled' || currentStatus === 'refunded') && (
          <div className="mt-3 rounded-lg bg-white p-4">
            <div className="flex items-center gap-4">
              <PickuMascot variant="cancelled" size="lg" />
              <div className="flex-1">
                <p className="font-semibold text-red-800">
                  Pedido cancelado
                </p>
                <p className="mt-1 text-sm text-red-700">
                  Picku entiende, a veces las cosas cambian. Esperamos verte pronto.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Receipt */}
      <OrderReceipt
        order={{
          ...order,
          pickupSlotStart:
            typeof order.pickupSlotStart === 'string'
              ? new Date(order.pickupSlotStart)
              : order.pickupSlotStart,
          pickupSlotEnd:
            typeof order.pickupSlotEnd === 'string'
              ? new Date(order.pickupSlotEnd)
              : order.pickupSlotEnd,
          status: currentStatus,
        }}
      />

      {/* Review Section */}
      {currentStatus === 'delivered' && (
        <div className="card">
          <div className="mb-4 flex items-center gap-2 border-b pb-4">
            <Star className="h-5 w-5 text-yellow-400" />
            <h3 className="text-lg font-semibold">Califica tu experiencia</h3>
          </div>

          {authLoading ? (
            <div className="py-4 text-center text-sm text-gray-500">
              Cargando...
            </div>
          ) : !user ? (
            <div className="text-center">
              <p className="mb-4 text-gray-600">
                Inicia sesión para dejar una reseña
              </p>
              <button onClick={handleLogin} className="btn-primary">
                <LogIn className="mr-2 h-4 w-4" />
                Iniciar Sesión
              </button>
            </div>
          ) : hasReview ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">¡Gracias por tu reseña!</span>
              </div>
              <div className="mt-2 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${star <= order.review!.rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                      }`}
                  />
                ))}
              </div>
            </div>
          ) : reviewSubmitted ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">
                  ¡Reseña enviada exitosamente!
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <p className="mb-3">
                  ¿Quieres calificar el restaurante o algún producto específico?
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedProductId('restaurant')}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${selectedProductId === 'restaurant'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    Restaurante completo
                  </button>
                  {order.items.map((item) => (
                    <button
                      key={item.product.id}
                      onClick={() => setSelectedProductId(item.product.id)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${selectedProductId === item.product.id
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {item.product.name}
                    </button>
                  ))}
                </div>
              </div>

              {selectedProductId !== null && (
                <ReviewForm
                  orderId={order.id}
                  restaurantId={order.restaurant.id}
                  productId={
                    selectedProductId === 'restaurant'
                      ? undefined
                      : selectedProductId
                  }
                  productName={
                    selectedProductId === 'restaurant'
                      ? order.restaurant.name
                      : order.items.find(
                        (i) => i.product.id === selectedProductId
                      )?.product.name
                  }
                  onSuccess={() => {
                    setReviewSubmitted(true);
                    setSelectedProductId(null);
                  }}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Realtime Indicator */}
      <div className="text-center text-xs text-gray-500">
        <span className="inline-flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
          </span>
          Actualización automática activa
        </span>
      </div>

      {/* Print Button */}
      <div className="mt-8 text-center">
        <button
          onClick={handlePrint}
          className="btn-secondary"
        >
          Imprimir comprobante
        </button>
      </div>
    </div>
  );
}
