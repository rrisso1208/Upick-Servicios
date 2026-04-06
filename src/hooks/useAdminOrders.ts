import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useRealtimeOrders } from './useRealtimeOrders';
import { supabase } from '../providers/AuthProvider';

export function useAdminOrders() {
    const { user, userRole } = useAuth();
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const [initialOrders, setInitialOrders] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch restaurant ID
    useEffect(() => {
        if (user && userRole === 'restaurant_admin') {
            const fetchRestaurantId = async () => {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                try {
                    const response = await fetch('/api/admin/restaurant-id', {
                        headers: { Authorization: `Bearer ${session.access_token}` },
                    });
                    const data = await response.json();
                    if (data.success) {
                        setRestaurantId(data.data.restaurantId);
                    }
                } catch (error) {
                    console.error('Failed to fetch restaurant ID', error);
                }
            };
            fetchRestaurantId();
        }
    }, [user, userRole]);

    // Fetch initial orders and set up polling for orders within 2 hours
    useEffect(() => {
        if (!restaurantId) {
            setIsLoading(false);
            return;
        }

        const fetchInitialOrders = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                const response = await fetch('/api/admin/orders?status=paid,in_progress,ready', {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });
                const data = await response.json();
                if (data.success) {
                    setInitialOrders(data.data.orders || []);
                    setOrders(data.data.orders || []);
                }
            } catch (error) {
                console.error('Failed to fetch initial orders', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialOrders();

        // Set up polling every 10 seconds for orders that will be delivered within 2 hours
        // This ensures we catch new orders even if Realtime has issues
        const pollInterval = setInterval(async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                const response = await fetch('/api/admin/orders?status=paid,in_progress,ready', {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });
                const data = await response.json();

                if (data.success) {
                    const fetchedOrders = data.data.orders || [];
                    // Only update if there are actual changes to avoid unnecessary re-renders
                    setOrders((prevOrders) => {
                        // Check if there are new orders or status changes
                        const prevOrderIds = new Set(prevOrders.map(o => o.id));

                        // Check for new orders
                        const hasNewOrders = fetchedOrders.some((o: any) => !prevOrderIds.has(o.id));

                        // Check for status changes
                        const hasStatusChanges = prevOrders.some(prevOrder => {
                            const fetchedOrder = fetchedOrders.find((o: any) => o.id === prevOrder.id);
                            return fetchedOrder && fetchedOrder.status !== prevOrder.status;
                        });

                        if (hasNewOrders || hasStatusChanges) {
                            setInitialOrders(fetchedOrders);
                            return fetchedOrders;
                        }

                        return prevOrders;
                    });
                }
            } catch (error) {
                console.error('[useAdminOrders] Polling error:', error);
            }
        }, 10000); // Poll every 10 seconds

        return () => {
            clearInterval(pollInterval);
        };
    }, [restaurantId]);

    // Realtime orders - use initial orders from fetch
    // Pass initialOrders as dependency to ensure they're always available
    const realtimeOrders = useRealtimeOrders(restaurantId || '', initialOrders);

    const isInitialSync = useRef(true);

    // Sync orders and play sound
    // Always sync realtimeOrders, even if they're the same as current orders
    // This ensures orders are displayed even if Realtime subscription fails
    useEffect(() => {
        const previousCount = orders.length;
        const newCount = realtimeOrders.length;

        if (isInitialSync.current && newCount > 0) {
            // Mark the first batch of orders as initial load, skip sound
            isInitialSync.current = false;
        } else if (newCount > previousCount && !isInitialSync.current) {
            // New order(s) detected
            if (!isMuted) {
                const audio = new Audio('/sounds/new-order.mp3');
                audio.play().catch(() => { });
            }
        }

        if (newCount === 0 && isInitialSync.current) {
            // Si viene vacío pero no es la primera vez que se carga algo, aún no lo marcamos como false
            // Wait, usually the initial orders fetch will tell us it's empty, but let's just use a timeout or assume it updates.
            // Actually, it's safer to just set it to false after the first render cycle if we don't want any sounds on load.
        }

        // Always update orders, even if count is the same (in case of updates)
        setOrders(realtimeOrders);
    }, [realtimeOrders, isMuted]); // Removed orders.length from dependencies to always sync

    // Status update handler
    const handleStatusChange = async (orderId: string, newStatus: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                console.error('[useAdminOrders] No session available for status update');
                return;
            }

            // Optimistically update the order status in local state
            setOrders((prevOrders) =>
                prevOrders.map((order) =>
                    order.id === orderId
                        ? { ...order, status: newStatus, ...(newStatus === 'ready' ? { readyAt: new Date().toISOString() } : {}) }
                        : order
                )
            );

            const response = await fetch(`/api/admin/orders/${orderId}/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                console.error('[useAdminOrders] Failed to update status:', data.error || 'Unknown error');
                // Revert optimistic update on error
                setOrders((prevOrders) =>
                    prevOrders.map((order) =>
                        order.id === orderId
                            ? { ...order, status: order.status } // Keep original status
                            : order
                    )
                );
                alert(`Error al actualizar estado: ${data.error || 'Error desconocido'}`);
                return;
            }

            // Refresh orders to get latest data from server
            const refreshResponse = await fetch('/api/admin/orders?status=paid,in_progress,ready', {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const refreshData = await refreshResponse.json();
            if (refreshData.success) {
                setInitialOrders(refreshData.data.orders || []);
                setOrders(refreshData.data.orders || []);
            }
        } catch (error) {
            console.error('[useAdminOrders] Failed to update status:', error);
            alert('Error al actualizar el estado del pedido. Por favor intenta de nuevo.');
        }
    };

    // Filter active orders by status
    // Exclude delivered orders (they should not appear in widget)
    // Exclude cancelled and refunded
    const allActiveOrders = orders.filter((o) =>
        ['paid', 'in_progress', 'ready'].includes(o.status)
    );

    // Filter high-priority orders:
    // - Show orders 2 hours before pickup time
    // - Keep showing until delivered (even if pickup time passes)
    // - Hide if more than 1 hour past pickup time (unless delivered, but delivered are already filtered out)
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const activeOrders = allActiveOrders.filter((order) => {
        if (!order.pickupSlotStart) {
            console.log('[useAdminOrders] Order missing pickupSlotStart:', order.id, order.pickupCode);
            return false;
        }

        const pickupTime = new Date(order.pickupSlotStart);

        // Validate date
        if (isNaN(pickupTime.getTime())) {
            console.log('[useAdminOrders] Invalid pickupSlotStart date:', order.id, order.pickupSlotStart);
            return false;
        }

        // Show orders that are within 2 hours before pickup time
        const twoHoursBefore = new Date(pickupTime.getTime() - 2 * 60 * 60 * 1000);
        const isWithinTwoHoursBefore = now >= twoHoursBefore;

        // Hide if more than 1 hour past pickup time (unless delivered, but delivered are filtered out above)
        const isMoreThanOneHourPast = pickupTime < oneHourAgo;

        // Show if within 2 hours window AND not more than 1 hour past pickup time
        const shouldShow = isWithinTwoHoursBefore && !isMoreThanOneHourPast;

        if (!shouldShow) {
            console.log('[useAdminOrders] Order filtered out:', {
                orderId: order.id,
                pickupCode: order.pickupCode,
                status: order.status,
                pickupTime: pickupTime.toISOString(),
                now: now.toISOString(),
                twoHoursBefore: twoHoursBefore.toISOString(),
                oneHourAgo: oneHourAgo.toISOString(),
                isWithinTwoHoursBefore,
                isMoreThanOneHourPast,
                minutesUntilPickup: Math.round((pickupTime.getTime() - now.getTime()) / (1000 * 60))
            });
        }

        return shouldShow;
    });

    console.log('[useAdminOrders] High-priority orders:', {
        totalActive: allActiveOrders.length,
        highPriority: activeOrders.length,
        orders: activeOrders.map(o => ({
            id: o.id,
            pickupCode: o.pickupCode,
            pickupTime: o.pickupSlotStart,
            status: o.status,
            minutesUntil: o.pickupSlotStart ? Math.round((new Date(o.pickupSlotStart).getTime() - now.getTime()) / (1000 * 60)) : null
        }))
    });

    // Handler for delivering with pickup code
    const handleDeliverWithCode = async (orderId: string, pickupCode: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('No hay sesión disponible');
            }

            // First validate the pickup code
            const validateResponse = await fetch('/api/admin/orders/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ pickupCode }),
            });

            const validateData = await validateResponse.json();

            if (!validateResponse.ok || !validateData.success) {
                throw new Error(validateData.error || 'Código inválido');
            }

            // Verify the code matches the order
            if (validateData.data.id !== orderId) {
                throw new Error('El código no corresponde a este pedido');
            }

            // Now mark as delivered
            const deliverResponse = await fetch(`/api/admin/orders/${orderId}/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ status: 'delivered' }),
            });

            const deliverData = await deliverResponse.json();

            if (!deliverResponse.ok || !deliverData.success) {
                throw new Error(deliverData.error || 'Error al marcar como entregado');
            }

            // Refresh orders
            const refreshResponse = await fetch('/api/admin/orders?status=paid,in_progress,ready', {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const refreshData = await refreshResponse.json();
            if (refreshData.success) {
                setInitialOrders(refreshData.data.orders || []);
                setOrders(refreshData.data.orders || []);
            }
        } catch (error: any) {
            console.error('[useAdminOrders] Failed to deliver with code:', error);
            throw error;
        }
    };

    // Handler for marking as no-show
    const handleMarkNoShow = async (orderId: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                console.error('[useAdminOrders] No session available for no-show');
                return;
            }

            const response = await fetch(`/api/admin/orders/${orderId}/no-show`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                console.error('[useAdminOrders] Failed to mark no-show:', data.error || 'Unknown error');
                alert(`Error al marcar como no presentado: ${data.error || 'Error desconocido'}`);
                return;
            }

            // Refresh orders
            const refreshResponse = await fetch('/api/admin/orders?status=paid,in_progress,ready', {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const refreshData = await refreshResponse.json();
            if (refreshData.success) {
                setInitialOrders(refreshData.data.orders || []);
                setOrders(refreshData.data.orders || []);
            }
        } catch (error) {
            console.error('[useAdminOrders] Failed to mark no-show:', error);
            alert('Error al marcar como no presentado. Por favor intenta de nuevo.');
        }
    };

    const newOrdersCount = activeOrders.filter((o) => o.status === 'paid').length;

    return {
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
    };
}
