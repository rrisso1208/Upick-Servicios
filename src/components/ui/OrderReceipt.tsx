'use client';

import { QRDisplay } from '@/components/QRDisplay';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { MapPin, Clock, Package } from 'lucide-react';

interface OrderReceiptProps {
  order: {
    id: string;
    pickupCode: string;
    pickupSlotStart: Date;
    pickupSlotEnd: Date;
    totalAmount: number;
    discountAmount?: number;
    deliveryCost?: number; // Delivery cost in cents
    serviceFeeAmount?: number; // Service fee amount in cents
    takeoutFeeAmount?: number;
    status?: string; // Order status to hide QR if delivered
    restaurant: {
      name: string;
      location?: string | null;
    };
    deliveryPoint?: {
      name: string;
      category?: string | null;
    } | null;
    coupon?: {
      code: string;
      discountType: string;
      discountValue: number;
    } | null;
    items: Array<{
      quantity: number;
      product: {
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
  };
}

export function OrderReceipt({ order }: OrderReceiptProps) {
  // Create QR code data with orderId and pickupCode
  const qrData = JSON.stringify({
    orderId: order.id,
    pickupCode: order.pickupCode,
    type: 'upick_order',
  });

  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';
  const isPendingPayment = order.status === 'awaiting_payment';

  // QR only when it can be used (not delivered, not cancelled)
  const showQR = !isDelivered && !isCancelled && !isPendingPayment;

  const showInstructions = !isPendingPayment;


  // Pickup time details: hide when cancelled (optional: you can also hide when delivered if you want)
  const showPickupDetails = !isCancelled;

  return (
    <div className="mx-auto max-w-md space-y-6">
      {/* QR Code - Only show if not delivered */}
      {showQR && (
        <QRDisplay
          variant="restaurant"
          value={qrData}
          pickupCode={order.pickupCode}
        />
      )}

      {/* Restaurant & Pickup Details */}
      {showPickupDetails && (
        <div className="card space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{order.restaurant.name}</h3>
            {order.restaurant.location && (
              <div className="mt-1 flex items-center text-sm text-gray-600">
                <MapPin className="mr-1 h-4 w-4" />
                {order.restaurant.location}
              </div>
            )}
          </div>

          <div className="flex items-start gap-3 rounded-lg bg-primary-50 p-4">
            <Clock className="mt-0.5 h-5 w-5 text-primary-600" />
            <div>
              <p className="font-semibold text-primary-900">Hora de recogida</p>
              <p className="text-lg font-bold text-primary-700">
                {format(new Date(order.pickupSlotStart), 'h:mm a', {
                  locale: es,
                })}
                {' - '}
                {format(new Date(order.pickupSlotEnd), 'h:mm a', { locale: es })}
              </p>
              <p className="text-sm text-primary-700">
                {format(new Date(order.pickupSlotStart), "EEEE, d 'de' MMMM", {
                  locale: es,
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Order Items */}
      <div className="card">
        <div className="mb-3 flex items-center gap-2 text-gray-700">
          <Package className="h-5 w-5" />
          <h3 className="font-semibold">Tu pedido</h3>
        </div>
        <div className="space-y-2">
          {order.items.map((item, idx) => {
            // Calculate original price (using product.price or promotionPrice if applicable)
            const productOriginalPrice = item.product.promotionPrice 
              ? item.product.price 
              : item.product.price;
            const productFinalPrice = item.product.promotionPrice 
              ? item.product.promotionPrice 
              : item.product.price;
            
            // Calculate item subtotal (unitPrice already includes product discount if any)
            const itemSubtotal = item.unitPrice * item.quantity;
            const optionsTotal = (item.options || []).reduce(
              (sum, opt) => sum + opt.priceDelta * item.quantity,
              0
            );
            const itemTotal = itemSubtotal + optionsTotal;
            
            // Calculate original item total (before product discount)
            const originalItemTotal = productOriginalPrice * item.quantity + optionsTotal;
            const productDiscount = originalItemTotal - itemTotal;
            const hasProductDiscount = productDiscount > 0;

            return (
              <div key={idx} className="border-b border-gray-100 py-2 last:border-0">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-900">
                    {item.quantity}x {item.product.name}
                  </span>
                  <div className="text-right">
                    {hasProductDiscount ? (
                      <>
                        <span className="text-gray-400 line-through">
                          {formatCurrency(originalItemTotal)}
                        </span>
                        <span className="ml-2 font-medium text-gray-900">
                          {formatCurrency(itemTotal)}
                        </span>
                      </>
                    ) : (
                      <span className="font-medium text-gray-900">
                        {formatCurrency(itemTotal)}
                      </span>
                    )}
                  </div>
                </div>
                {hasProductDiscount && (
                  <div className="mt-1 text-xs text-green-600">
                    Descuento de producto: -{formatCurrency(productDiscount)}
                  </div>
                )}
                {/* Options */}
                {item.options && item.options.length > 0 && (
                  <div className="mt-1 space-y-1 pl-4">
                    {item.options.map((opt: any, optIdx: number) => (
                      <div
                        key={optIdx}
                        className="flex justify-between text-xs text-gray-500"
                      >
                        <span>
                          + {opt.productOption.group.name}: {opt.productOption.name}
                        </span>
                        {opt.priceDelta > 0 && (
                          <span>
                            {formatCurrency(opt.priceDelta * item.quantity)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {/* Notes */}
                {item.notes && (
                  <div className="mt-1 pl-4 text-xs italic text-gray-500">
                    Note: {item.notes}
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Calculate subtotal before coupon discount */}
          {(() => {
            const subtotalBeforeCoupon = order.items.reduce((sum, item) => {
              const itemSubtotal = item.unitPrice * item.quantity;
              const optionsTotal = (item.options || []).reduce(
                (sum, opt) => sum + opt.priceDelta * item.quantity,
                0
              );
              return sum + itemSubtotal + optionsTotal;
            }, 0);
            
            const couponDiscount = order.discountAmount || 0;
            const hasCouponDiscount = couponDiscount > 0;
            const deliveryCost = order.deliveryCost || 0;
            const hasDeliveryCost = deliveryCost > 0;
            const serviceFeeAmount = order.serviceFeeAmount || 0;
            const hasServiceFee = serviceFeeAmount > 0;
            
            return (
              <div className="border-t pt-2 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className="text-gray-700">
                    {formatCurrency(subtotalBeforeCoupon)}
                  </span>
                </div>
                {hasCouponDiscount && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>
                      Descuento {order.coupon ? `(${order.coupon.code})` : ''}:
                    </span>
                    <span>-{formatCurrency(couponDiscount)}</span>
                  </div>
                )}
                {hasDeliveryCost && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Domicilio:</span>
                    <span className="text-gray-700">
                      {formatCurrency(deliveryCost)}
                    </span>
                  </div>
                )}
                {(order.takeoutFeeAmount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Recargo para llevar:</span>
                    <span>{formatCurrency(order.takeoutFeeAmount ?? 0)}</span>
                  </div>
                )}
                {hasServiceFee ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Costo de Servicio (UPick):</span>
                    <span className="text-gray-700">
                      {formatCurrency(serviceFeeAmount)}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Instructions */}
      {showInstructions && (
        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900 no-print">
          <p className="font-semibold">Instrucciones:</p>
          <ol className="ml-4 mt-2 list-decimal space-y-1">
            <li>Presenta este código al llegar al restaurante</li>
            <li>Recoge tu pedido en la hora indicada</li>
            <li>¡Disfruta tu comida!</li>
          </ol>
        </div>
      )}
    </div>
  );
}
