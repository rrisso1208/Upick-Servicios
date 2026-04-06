import { useState } from 'react';
import { Check, Clock, AlertCircle, X, UserX, FileText, Utensils, ShoppingBag, Truck, MessageCircle } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';

interface OrderListContentProps {
    activeOrders: any[];
    handleStatusChange: (orderId: string, newStatus: string) => void;
    handleDeliverWithCode?: (orderId: string, pickupCode: string) => Promise<void>;
    handleMarkNoShow?: (orderId: string) => void;
}

export function OrderListContent({ 
    activeOrders, 
    handleStatusChange,
    handleDeliverWithCode,
    handleMarkNoShow,
}: OrderListContentProps) {
    const [deliveryModal, setDeliveryModal] = useState<{ orderId: string; pickupCode: string } | null>(null);
    const [deliveryCode, setDeliveryCode] = useState('');
    const [deliveryLoading, setDeliveryLoading] = useState(false);
    const [deliveryError, setDeliveryError] = useState('');
    // Helper for status colors/labels
    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'paid':
                return { label: 'Nuevo', color: 'bg-red-100 text-red-800', border: 'border-red-200' };
            case 'in_progress':
                return { label: 'En Prep.', color: 'bg-yellow-100 text-yellow-800', border: 'border-yellow-200' };
            case 'ready':
                return { label: 'Listo', color: 'bg-green-100 text-green-800', border: 'border-green-200' };
            case 'delivered':
                return { label: 'Entregado', color: 'bg-blue-100 text-blue-800', border: 'border-blue-200' };
            default:
                return { label: status, color: 'bg-gray-100 text-gray-800', border: 'border-gray-200' };
        }
    };

    if (activeOrders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <Check className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Todo al día</p>
            </div>
        );
    }

  const getDisplayTotal = (order: any) => {
    const total = Number(order.totalAmount || 0);

    // intenta detectar el fee (ajusta nombres según tu modelo)
    const fee =
      Number(order.serviceFeeAmount ?? order.serviceFee ?? order.platformFee ?? 0);

    // si fee viene en pesos y total está en centavos (o viceversa), esto es clave.
    // Por tu UI: totalAmount parece venir en centavos (lo divides /100).
    // Entonces fee debe estar también en centavos. Si tu fee está en pesos (850),
    // conviértelo a centavos multiplicando por 100.
    //
    // Si el fee en tu DB está guardado como 850 (pesos) y totalAmount está en centavos:
    // const feeInCents = fee * 100
    //
    // Yo te dejo ambos con heurística:
    const feeInCents = fee < 5000 ? fee * 100 : fee; // si es 850 -> 85.000? no, 850*100=85000 centavos = $850
    const clean = Math.max(0, total - feeInCents);

    return clean;
  };

    return (
        <>
            {activeOrders.map((order) => {
                const statusInfo = getStatusInfo(order.status);
                const pickupTime = order.pickupSlotStart ? new Date(order.pickupSlotStart) : null;
                const minutesUntilPickup = pickupTime ? differenceInMinutes(pickupTime, new Date()) : null;
                const isUrgent = minutesUntilPickup !== null && minutesUntilPickup <= 30;
                const isVeryUrgent = minutesUntilPickup !== null && minutesUntilPickup <= 15;
                
                return (
                    <div
                        key={order.id}
                        className={`rounded-lg border bg-white p-3 shadow-sm transition-all hover:shadow-md ${statusInfo.border} ${isVeryUrgent ? 'ring-2 ring-red-500' : isUrgent ? 'ring-1 ring-orange-400' : ''}`}
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-sm font-bold text-gray-900">
                                        #{order.pickupCode}
                                    </span>
                                    <span
                                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusInfo.color}`}
                                    >
                                        {statusInfo.label}
                                    </span>
                                    {/* Service Mode Badge */}
                                    {order.serviceMode === 'internal_delivery' ? (
                                        <span className="flex items-center gap-1 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
                                            <Truck className="h-3 w-3" /> Domicilio
                                        </span>
                                    ) : order.serviceMode === 'eat_in' || order.type === 'eat_in' ? (
                                        <span className="flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                                            <Utensils className="h-3 w-3" /> Comer acá
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">
                                            <ShoppingBag className="h-3 w-3" /> Para llevar
                                        </span>
                                    )}
                                    {isVeryUrgent && (
                                        <span className="flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-800">
                                            <AlertCircle className="h-3 w-3" />
                                            URGENTE
                                        </span>
                                    )}
                                </div>
                              <div className="mt-1 flex items-center gap-2 text-xs">
                                {pickupTime ? (
                                  <>
                                    <div className="flex items-center gap-1 text-gray-600">
                                      <Clock className="h-3 w-3" />
                                      <span className="font-medium">
          Entrega: {format(pickupTime, 'h:mm a')}
        </span>
                                    </div>

                                    {minutesUntilPickup !== null && (
                                      <div
                                        className={`flex items-center gap-1 ${
                                          minutesUntilPickup <= 15
                                            ? 'text-red-600 font-bold'
                                            : minutesUntilPickup <= 30
                                              ? 'text-orange-600 font-semibold'
                                              : 'text-gray-600'
                                        }`}
                                      >
                                        <Clock className="h-3 w-3" />
                                        {minutesUntilPickup > 0
                                          ? `Faltan ${minutesUntilPickup} min`
                                          : minutesUntilPickup === 0
                                            ? 'Es ahora'
                                            : `Va tarde ${Math.abs(minutesUntilPickup)} min`}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="text-gray-500">Sin hora de entrega</div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                                <span className="block text-xs font-medium text-gray-900">
                                    ${(getDisplayTotal(order) / 100).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Invoice Request Indicator */}
                        {order.needsInvoice && (
                            <div className="mb-2">
                                <div className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800">
                                    <FileText className="h-3 w-3" />
                                    Factura Electrónica
                                </div>
                            </div>
                        )}

                        {/* Internal Delivery Information */}
                        {order.serviceMode === 'internal_delivery' && order.deliveryPoint && (
                            <div className="mb-2 rounded-lg border border-purple-200 bg-purple-50 p-2">
                                <div className="mb-1 flex items-center gap-1.5">
                                    <Truck className="h-3.5 w-3.5 text-purple-600" />
                                    <span className="text-[10px] font-bold text-purple-700">Domicilio - Se entregará en:</span>
                                </div>
                                <div className="text-xs font-medium text-gray-900">
                                    {order.deliveryPoint.name}
                                </div>
                                {order.deliveryPoint.category && (
                                    <div className="mt-0.5 text-[10px] text-gray-600">
                                        {order.deliveryPoint.category}
                                    </div>
                                )}
                                {order.customerPhone && (
                                    <div className="mt-2">
                                        <a
                                            href={`https://wa.me/57${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                                `Hola ${order.student?.firstName || 'cliente'}, somos ${order.restaurant?.name || 'el restaurante'}, ya vamos en camino hacia ${order.deliveryPoint.name} con tu pedido.`
                                            )}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2 py-1 text-[10px] font-medium text-white transition-colors hover:bg-green-700"
                                            title="Contactar cliente por WhatsApp"
                                        >
                                            <MessageCircle className="h-3 w-3" />
                                            WhatsApp
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Items with specifications and notes */}
                        <div className="mb-3 space-y-2">
                            {order.items?.map((item: any, itemIndex: number) => (
                                <div key={itemIndex} className="text-xs text-gray-600">
                                    <div className="font-medium text-gray-900">
                                        {item.quantity}x {item.product?.name || 'Producto'}
                                    </div>
                                    
                                    {/* Specifications/Options */}
                                    {item.options && item.options.length > 0 && (
                                        <div className="mt-0.5 space-y-0.5 pl-2 text-gray-600">
                                            {item.options.map((opt: any, optIndex: number) => (
                                                <div key={optIndex} className="text-[10px]">
                                                    • {opt.productOption?.group?.name || 'Opción'}: {opt.productOption?.name || 'N/A'}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    
                                    {/* Notes */}
                                    {item.notes && (
                                        <div className="mt-1 rounded bg-yellow-50 px-1.5 py-0.5 text-[10px] text-yellow-800">
                                            <span className="font-medium">Nota:</span> {item.notes}
                                        </div>
                                    )}
                                </div>
                            )) || <div className="text-xs text-gray-500">Sin items</div>}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            {order.status === 'paid' && (
                                <button
                                    onClick={() => handleStatusChange(order.id, 'in_progress')}
                                    className="flex-1 rounded bg-blue-600 py-1.5 text-xs font-bold text-white hover:bg-blue-700 active:bg-blue-800"
                                >
                                    Aceptar
                                </button>
                            )}
                            {order.status === 'in_progress' && (
                                <button
                                    onClick={() => handleStatusChange(order.id, 'ready')}
                                    className="flex-1 rounded bg-yellow-500 py-1.5 text-xs font-bold text-white hover:bg-yellow-600 active:bg-yellow-700"
                                >
                                    Marcar Listo
                                </button>
                            )}
                            {order.status === 'ready' && (
                                <button
                                    onClick={() => setDeliveryModal({ orderId: order.id, pickupCode: order.pickupCode })}
                                    className="flex-1 rounded bg-green-600 py-1.5 text-xs font-bold text-white hover:bg-green-700 active:bg-green-800"
                                >
                                    Entregar
                                </button>
                            )}
                            {/* Show "Cliente no se presentó" button if more than 1 hour past pickup time */}
                            {(() => {
                                if (!pickupTime || order.status === 'delivered') return null;
                                const minutesPastPickup = pickupTime ? differenceInMinutes(new Date(), pickupTime) : null;
                                const isMoreThanOneHourPast = minutesPastPickup !== null && minutesPastPickup > 60;
                                
                                if (isMoreThanOneHourPast && handleMarkNoShow && order.status !== 'delivered') {
                                    return (
                                        <button
                                            onClick={() => {
                                                if (confirm('¿Marcar este pedido como "Cliente no se presentó"? Esto lo moverá fuera de la vista de pedidos activos.')) {
                                                    handleMarkNoShow(order.id);
                                                }
                                            }}
                                            className="flex-1 rounded bg-orange-600 py-1.5 text-xs font-bold text-white hover:bg-orange-700 active:bg-orange-800"
                                        >
                                            <UserX className="inline h-3 w-3 mr-1" />
                                            No se presentó
                                        </button>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                    </div>
                );
            })}

            {/* Delivery Code Modal */}
            {deliveryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">Confirmar Entrega</h3>
                            <button
                                onClick={() => {
                                    setDeliveryModal(null);
                                    setDeliveryCode('');
                                    setDeliveryError('');
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        
                        <p className="mb-4 text-sm text-gray-600">
                            Ingresa el código de recogida para confirmar la entrega del pedido <strong>#{deliveryModal.pickupCode}</strong>
                        </p>

                        <div className="mb-4">
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                Código de Recogida
                            </label>
                            <input
                                type="text"
                                value={deliveryCode}
                                onChange={(e) => {
                                    setDeliveryCode(e.target.value.toUpperCase().slice(0, 6));
                                    setDeliveryError('');
                                }}
                                placeholder="Ej: ABC123"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-center text-lg font-mono tracking-widest uppercase focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                maxLength={6}
                                autoFocus
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && deliveryCode.length === 6) {
                                        handleDeliver();
                                    }
                                }}
                            />
                            {deliveryError && (
                                <p className="mt-2 text-sm text-red-600">{deliveryError}</p>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setDeliveryModal(null);
                                    setDeliveryCode('');
                                    setDeliveryError('');
                                }}
                                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeliver}
                                disabled={deliveryCode.length !== 6 || deliveryLoading}
                                className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                {deliveryLoading ? 'Validando...' : 'Confirmar Entrega'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );

    async function handleDeliver() {
        if (!deliveryModal || !handleDeliverWithCode) return;
        
        if (deliveryCode.length !== 6) {
            setDeliveryError('El código debe tener 6 caracteres');
            return;
        }

        setDeliveryLoading(true);
        setDeliveryError('');

        try {
            await handleDeliverWithCode(deliveryModal.orderId, deliveryCode);
            setDeliveryModal(null);
            setDeliveryCode('');
        } catch (error: any) {
            setDeliveryError(error.message || 'Error al validar el código');
        } finally {
            setDeliveryLoading(false);
        }
    }
}
