'use client';

import { useAdminOrders } from '../../../../hooks/useAdminOrders';
import { OrderListContent } from '../../../../components/admin/OrderListContent';
import { Bell, BellOff, ShoppingBag } from 'lucide-react';

export default function OrderWidgetPage() {
    const {
        user,
        userRole,
        restaurantId,
        activeOrders,
        isMuted,
        setIsMuted,
        handleStatusChange,
    } = useAdminOrders();


    if (!user || userRole !== 'restaurant_admin' || !restaurantId) {
        return (
            <div className="flex h-screen items-center justify-center p-4 text-center text-sm text-gray-500">
                Cargando o no autorizado...
            </div>
        );
    }

  const restaurantName =
    activeOrders?.[0]?.restaurant?.name ||
    activeOrders?.[0]?.restaurantName ||
    'Restaurante';

    return (
        <div className="flex h-screen flex-col bg-white">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-primary-600" />
                  <h3 className="font-bold text-gray-900">{restaurantName}</h3>
                </div>
                <div className="text-xs text-gray-500 font-medium">
                  Pedidos activos: {activeOrders.length}
                </div>
              </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                        title={isMuted ? 'Activar sonido' : 'Silenciar'}
                    >
                        {isMuted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            {/* Order List */}
            <div className="flex-1 overflow-y-auto p-2 bg-gray-50/50 space-y-2">
                <OrderListContent
                    activeOrders={activeOrders}
                    handleStatusChange={handleStatusChange}
                />
            </div>
        </div>
    );
}
