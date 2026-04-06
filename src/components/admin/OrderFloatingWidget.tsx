'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAdminOrders } from '../../hooks/useAdminOrders';
import { OrderListContent } from './OrderListContent';
import {
    Bell,
    BellOff,
    Minimize2,
    ShoppingBag,
    ExternalLink,
} from 'lucide-react';

export function OrderFloatingWidget() {
    const {
        user,
        userRole,
        restaurantId,
        activeOrders,
        newOrdersCount,
        isMuted,
        setIsMuted,
        handleStatusChange,
        handleDeliverWithCode,
        handleMarkNoShow,
    } = useAdminOrders();

    const pathname = usePathname(); // Add specific check for widget page

    // Hide recursively on the widget page itself
    if (pathname === '/admin/orders/widget') {
        return null;
    }

    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ x: 20, y: 20 }); // Bottom-right offset
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Dragging logic
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPosition({
                    x: window.innerWidth - e.clientX + dragOffset.x - 300, // Adjust for width
                    y: window.innerHeight - e.clientY + dragOffset.y - 400, // Adjust for height
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    const handlePopOut = () => {
        const width = 350;
        const height = 600;
        const left = window.screen.width - width - 50;
        const top = window.screen.height - height - 100;

        window.open(
            '/admin/orders/widget',
            'UpickOrders',
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no,location=no`
        );
        setIsOpen(false); // Close the in-page widget
    };

    if (!user || userRole !== 'restaurant_admin' || !restaurantId) {
        return null;
    }

    // Compact Mode
    if (!isOpen) {
        return (
            <div
                className="fixed bottom-4 right-4 z-50 flex cursor-pointer items-center gap-3 rounded-full bg-white px-4 py-3 shadow-lg transition-transform hover:scale-105"
                onClick={() => setIsOpen(true)}
            >
                <div className="relative">
                    <ShoppingBag className="h-6 w-6 text-primary-600" />
                    {newOrdersCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                            {newOrdersCount}
                        </span>
                    )}
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900">Pedidos UPICK</span>
                    <span className="text-xs text-gray-500">
                        {activeOrders.length} activos
                    </span>
                </div>
            </div>
        );
    }

    // Detailed Mode
    return (
        <div
            className="fixed z-50 flex w-80 flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5"
            style={{
                bottom: '20px',
                right: '20px',
                // Simple positioning for now, draggable implementation can be refined
            }}
        >
            {/* Header */}
            <div
                className="flex cursor-move items-center justify-between bg-gray-50 px-4 py-3 border-b border-gray-100"
            // onMouseDown={handleMouseDown} // Dragging disabled for MVP simplicity/stability
            >
                <div className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-primary-600" />
                    <h3 className="font-bold text-gray-900">Pedidos ({activeOrders.length})</h3>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handlePopOut}
                        className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                        title="Abrir en ventana separada"
                    >
                        <ExternalLink className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                        title={isMuted ? 'Activar sonido' : 'Silenciar'}
                    >
                        {isMuted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                        title="Minimizar"
                    >
                        <Minimize2 className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Order List */}
            <div className="flex-1 overflow-y-auto p-2 max-h-[60vh] bg-gray-50/50 space-y-2">
                <OrderListContent
                    activeOrders={activeOrders}
                    handleStatusChange={handleStatusChange}
                    handleDeliverWithCode={handleDeliverWithCode}
                    handleMarkNoShow={handleMarkNoShow}
                />
            </div>
        </div>
    );
}
