'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '../../lib/utils';
import {
  Clock,
  User,
  X,
  Receipt,
  QrCode,
  Calendar,
  CheckCircle,
  UserX,
  Utensils,
  ShoppingBag,
  FileText,
  Truck,
  MessageCircle,
} from 'lucide-react';
import Link from 'next/link';
import { OrderStatus } from '@prisma/client';
import { useRouter } from 'next/navigation';

interface OrderCardProps {
  order: any; // Tipo genérico para aceptar cualquier estructura de Order
  onClick?: () => void;
  onCancel?: () => void;
  onStatusChange?: (orderId: string, newStatus: OrderStatus) => void; // Callback for status changes
  onMarkNoShow?: (orderId: string) => void; // Callback for marking as no-show
  showReceiptButton?: boolean; // Show button to view receipt with QR
  showAdminActions?: boolean; // Show admin action buttons (Mark as ready, etc.)
}

const statusConfig: Record<OrderStatus, { label: string; className: string }> =
  {
    awaiting_payment: { label: 'Pendiente pago', className: 'badge-warning' },
    payment_failed: { label: 'Pago fallido', className: 'badge-error' },
    paid: { label: 'Pagado', className: 'badge-info' },
    in_progress: { label: 'En preparación', className: 'badge-warning' },
    ready: { label: 'Listo', className: 'badge-success' },
    delivered: { label: 'Entregado', className: 'badge-info' },
    cancelled: { label: 'Cancelado', className: 'badge-error' },
    refunded: { label: 'Reembolsado', className: 'badge-error' },
  };

export function OrderCard({
  order,
  onClick,
  onCancel,
  onStatusChange,
  onMarkNoShow,
  showReceiptButton = false,
  showAdminActions = false,
}: OrderCardProps) {
  const router = useRouter();
  const statusInfo =
    statusConfig[order.status as OrderStatus] || statusConfig.awaiting_payment;
  const [canMarkNoShow, setCanMarkNoShow] = useState(false);
  const [canMarkReady, setCanMarkReady] = useState(false);
  const [minutesUntilReady, setMinutesUntilReady] = useState<number | null>(null);

  const totalAmount = Number(order.totalAmount || 0); // lo que pagó el cliente (normalmente incluye fee)
  const serviceFeeAmount = Number(order.serviceFeeAmount || 0); // fee Upick
  const restaurantAmount = Math.max(0, totalAmount - serviceFeeAmount); // venta real restaurante (sin fee)

  // Calculate if 20 minutes have passed since order was marked as ready
  // Update every minute to show button automatically when 20 minutes pass
  useEffect(() => {
    const checkCanMarkNoShow = () => {
      if (order.status !== 'ready' || !order.readyAt) {
        setCanMarkNoShow(false);
        return;
      }
      try {
        const readyAt = new Date(order.readyAt);
        const now = new Date();
        const minutesSinceReady =
          (now.getTime() - readyAt.getTime()) / (1000 * 60);
        setCanMarkNoShow(minutesSinceReady >= 20);
      } catch {
        setCanMarkNoShow(false);
      }
    };

    // Check immediately
    checkCanMarkNoShow();

    // Update every minute if order is ready
    if (order.status === 'ready' && order.readyAt) {
      const interval = setInterval(checkCanMarkNoShow, 60000); // Every minute
      return () => clearInterval(interval);
    }
  }, [order.status, order.readyAt]);

  useEffect(() => {
    const checkReadyAvailability = () => {
      if (!order.pickupSlotStart) {
        setCanMarkReady(true);
        return;
      }

      const pickup = new Date(order.pickupSlotStart);
      const now = new Date();

      const diffMinutes = (pickup.getTime() - now.getTime()) / (1000 * 60);

      setMinutesUntilReady(Math.ceil(diffMinutes));
      setCanMarkReady(
        diffMinutes <= 10 &&
        (order.status === 'paid' || order.status === 'in_progress')
      );
    };

    checkReadyAvailability();

    const interval = setInterval(checkReadyAvailability, 60000); // cada minuto

    return () => clearInterval(interval);
  }, [order.pickupSlotStart]);

  const handleViewReceipt = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/orders/${order.id}/receipt`);
  };

  // Show QR button only if order is paid, in_progress, or ready
  // CRITICAL: Do not show QR for unpaid or failed payments
  const canShowQR =
    order.status === 'paid' ||
    order.status === 'in_progress' ||
    order.status === 'ready';

  return (
    <div className="card transition-shadow hover:shadow-md" onClick={onClick}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-[200px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Show customer name instead of pickup code for admin panel */}
            {order.student ? (
              <span className="text-lg font-bold text-primary-600">
                {order.student.firstName && order.student.lastName
                  ? `${order.student.firstName} ${order.student.lastName}`
                  : order.student.firstName || order.student.email}
              </span>
            ) : (
              <span className="font-mono text-lg font-bold text-primary-600">
                {order.pickupCode || 'N/A'}
              </span>
            )}
            <span className={`badge ${statusInfo.className}`}>
              {statusInfo.label}
            </span>

            {/* Service Mode Badge */}
            {order.serviceMode === 'internal_delivery' ? (
              <span className="flex items-center gap-1 rounded bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-700">
                <Truck className="h-3 w-3" /> Domicilio Interno
              </span>
            ) : order.serviceMode === 'eat_in' || order.type === 'eat_in' ? (
              <span className="flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                <Utensils className="h-3 w-3" /> Comer acá
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                <ShoppingBag className="h-3 w-3" /> Para llevar
              </span>
            )}
          </div>

          {/* Invoice Request Indicator - Below customer name */}
          <div className="mt-1">
            {order.needsInvoice ? (
              <Link
                href={`/admin/invoices?orderId=${order.id}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                title="Ver datos de facturación electrónica"
              >
                <FileText className="h-3 w-3" />
                Factura Electrónica Solicitada
              </Link>
            ) : (
              <span className="text-xs text-gray-500">
                No solicitó factura electrónica
              </span>
            )}
          </div>

          {/* Internal Delivery Information - Show for both admin and student views */}
          {order.serviceMode === 'internal_delivery' && order.deliveryPoint && (
            <div className="mt-3 rounded-lg border-2 border-purple-200 bg-purple-50 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Truck className="h-5 w-5 text-purple-600" />
                <span className="font-bold text-purple-700">
                  Domicilio - Se entregará en:
                </span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="font-medium text-gray-900">
                  {order.deliveryPoint.name}
                </div>
                {order.deliveryPoint.category && (
                  <div className="text-xs text-gray-600">
                    {order.deliveryPoint.category}
                  </div>
                )}
                {/* Only show phone and WhatsApp button in admin view */}
                {order.customerPhone && showAdminActions && (
                  <>
                    <div className="text-xs text-gray-600">
                      Teléfono: {order.customerPhone}
                    </div>
                    <div className="mt-3">
                      <a
                        href={`https://wa.me/57${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                          `Hola ${order.student?.firstName || 'cliente'}, somos ${order.restaurant?.name || 'el restaurante'}, ya vamos en camino hacia ${order.deliveryPoint.name} con tu pedido.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Enviar WhatsApp
                      </a>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Table Information */}
          {order.table && (
            <div className="mt-3 rounded-lg border-2 border-blue-200 bg-blue-50 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Utensils className="h-5 w-5 text-blue-600" />
                <span className="font-bold text-blue-700">
                  Llevar a la Mesa:
                </span>
              </div>
              <div className="text-lg font-bold text-gray-900">
                {order.table.name}
              </div>
            </div>
          )}

          {/* Discount Information */}
          {(() => {
            const couponDiscount = order.discountAmount || 0;
            const hasCoupon = order.coupon && couponDiscount > 0;

            // Calculate product discounts
            const productDiscounts: Array<{ name: string; discount: number }> =
              [];
            if (order.items) {
              order.items.forEach((item: any) => {
                if (
                  item.product?.promotionPrice &&
                  item.product.promotionPrice < item.product.price
                ) {
                  const originalPrice = item.product.price * item.quantity;
                  const discountedPrice =
                    item.product.promotionPrice * item.quantity;
                  const discount = originalPrice - discountedPrice;
                  if (discount > 0) {
                    productDiscounts.push({
                      name: item.product.name,
                      discount: discount,
                    });
                  }
                }
              });
            }

            const hasProductDiscounts = productDiscounts.length > 0;

            if (!hasCoupon && !hasProductDiscounts) {
              return null;
            }

            return (
              <div className="mt-2 space-y-1 rounded-md bg-green-50 p-2">
                {hasCoupon && (
                  <div className="text-xs text-green-700">
                    <span className="font-medium">Cupón aplicado:</span>{' '}
                    {order.coupon.code} (-{formatCurrency(couponDiscount)})
                  </div>
                )}
                {hasProductDiscounts && (
                  <div className="text-xs text-green-700">
                    <span className="font-medium">
                      Descuentos de productos:
                    </span>
                    <ul className="mt-0.5 list-inside list-disc space-y-0.5">
                      {productDiscounts.map((pd, idx) => (
                        <li key={idx}>
                          {pd.name}: -{formatCurrency(pd.discount)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Show pickup code as secondary info for admin reference */}
          {order.pickupCode && (
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
              <span>Código: {order.pickupCode}</span>
            </div>
          )}

          {order.pickupSlotStart && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>
                  {format(new Date(order.pickupSlotStart), 'EEEE, d MMMM', {
                    locale: es,
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>
                  {format(new Date(order.pickupSlotStart), 'h:mm a', {
                    locale: es,
                  })}
                </span>
              </div>
            </div>
          )}
          {order.items && order.items.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-gray-600">
                {order.items.length} item(s)
              </p>
              <div className="space-y-1">
                {order.items.map((item: any, index: number) => (
                  <div key={index} className="text-xs text-gray-500">
                    <div className="font-medium text-gray-700">
                      {item.quantity}x {item.product?.name || 'Producto'}
                    </div>

                    {/* Specifications/Options */}
                    {item.options && item.options.length > 0 && (
                      <div className="mt-1 space-y-0.5 pl-2">
                        {item.options.map((opt: any, i: number) => (
                          <div key={i} className="text-gray-500">
                            • {opt.productOption?.group?.name}:{' '}
                            {opt.productOption?.name}
                          </div>
                        ))}
                      </div>
                    )}

                    {item.notes && (
                      <div className="mt-1 rounded bg-yellow-50 px-2 py-1 text-yellow-800">
                        <span className="font-medium">Nota:</span> {item.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin Actions */}
          {showAdminActions && onStatusChange && (
            <div className="mt-4 flex flex-wrap gap-2">
              {(order.status === 'paid' || order.status === 'in_progress') && (
                <button
                  disabled={!canMarkReady}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!canMarkReady) return;
                    onStatusChange(order.id, 'ready');
                  }}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors
                  ${
                    canMarkReady
                      ? 'bg-green-50 text-green-700 hover:bg-green-100'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none'
                  }`}
                >
                  <CheckCircle className="h-4 w-4" />
                  Marcar como Listo
                </button>
              )}
              {(order.status === 'paid' || order.status === 'in_progress') &&
                !canMarkReady &&
                minutesUntilReady &&
                minutesUntilReady > 10 && (
                  <p className="text-xs text-gray-500">
                    Disponible en {minutesUntilReady - 10} min
                  </p>
                )}
              {order.status === 'paid' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(order.id, 'in_progress');
                  }}
                  className="flex items-center gap-2 rounded-md bg-yellow-50 px-3 py-1.5 text-sm font-medium text-yellow-700 transition-colors hover:bg-yellow-100"
                >
                  <Clock className="h-4 w-4" />
                  En Preparación
                </button>
              )}
              {/* Show "Cliente no se presentó" button after 20 minutes of being ready */}
              {order.status === 'ready' && canMarkNoShow && onMarkNoShow && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      confirm(
                        '¿Marcar este pedido como "Cliente no se presentó"? Esto lo moverá fuera de la vista de pedidos activos.'
                      )
                    ) {
                      onMarkNoShow(order.id);
                    }
                  }}
                  className="flex items-center gap-2 rounded-md bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-700 transition-colors hover:bg-orange-100"
                  title="Han pasado más de 20 minutos desde que el pedido fue marcado como listo"
                >
                  <UserX className="h-4 w-4" />
                  Cliente no se presentó
                </button>
              )}
            </div>
          )}

          {/* Receipt Button */}
          {showReceiptButton && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleViewReceipt}
                className="flex items-center gap-2 rounded-md bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100"
              >
                <Receipt className="h-4 w-4" />
                Ver Recibo
                {canShowQR && <QrCode className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>

        <div className="text-right">
          <p className="text-lg font-bold">
            {formatCurrency(restaurantAmount|| 0)}
          </p>
          {onCancel && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
              }}
              className="mt-2 flex items-center gap-1 rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
            >
              <X className="h-4 w-4" />
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
