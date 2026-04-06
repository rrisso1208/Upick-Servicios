/**
 * Custom hook for real-time order updates
 * Subscribes to Supabase Realtime for order changes
 */

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../providers/AuthProvider';
import logger from '../lib/logger';
import { OrderStatus } from '@prisma/client';

export interface RealtimeOrder {
  id: string;
  status: OrderStatus;
  [key: string]: any;
}

export function useRealtimeOrders<T extends RealtimeOrder>(
  restaurantId: string,
  initialOrders: T[] = []
) {
  const [orders, setOrders] = useState<T[]>(initialOrders);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize orders when restaurantId or initialOrders change
  useEffect(() => {
    if (!restaurantId) {
      setOrders([]);
      setIsInitialized(false);
      return;
    }

    // Always sync initialOrders when they change, even if already initialized
    // This ensures orders are shown even if Realtime subscription fails
    if (initialOrders.length > 0) {
      setOrders(initialOrders);
      setIsInitialized(true);
    } else if (!isInitialized) {
      // If no initial orders yet, mark as initialized to prevent blocking
      setIsInitialized(true);
    }
  }, [restaurantId, initialOrders, isInitialized]);

  useEffect(() => {
    if (!restaurantId) {
      return;
    }

    // Create channel for this restaurant

    const uniqueChannelId = `restaurant:${restaurantId}:${Date.now()}`;
    const channel = supabase
      .channel(uniqueChannelId)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'Order',
          filter: `restaurantId=eq.${restaurantId}`,
        },
        (payload) => {
          const newOrderId =
            payload.new &&
              typeof payload.new === 'object' &&
              'id' in payload.new
              ? (payload.new as any).id
              : null;

          logger.info(
            { event: payload.eventType, orderId: newOrderId },
            'Realtime order event'
          );

          if (payload.eventType === 'INSERT' && newOrderId) {
            // New order created - fetch immediately and add to list
            const newOrderStatus =
              payload.new &&
                typeof payload.new === 'object' &&
                'status' in payload.new
                ? (payload.new as any).status
                : null;

            logger.info(
              { orderId: newOrderId, status: newOrderStatus },
              'New order detected via Realtime, fetching details...'
            );

            fetchOrderDetails(newOrderId)
              .then((order) => {
                if (order) {
                  // Only add if order has status paid, in_progress, or ready
                  // and has pickupSlotStart (will be filtered by time in useAdminOrders)
                  if (
                    ['paid', 'in_progress', 'ready'].includes(order.status) &&
                    order.pickupSlotStart
                  ) {
                    setOrders((prev) => {
                      // Check if order already exists to avoid duplicates
                      if (prev.find((o) => o.id === order.id)) {
                        return prev;
                      }
                      logger.info(
                        { orderId: order.id, pickupCode: order.pickupCode },
                        'New order added to realtime list'
                      );
                      return [order as T, ...prev];
                    });
                  }
                }
              })
              .catch((error) => {
                logger.error(
                  { error, orderId: newOrderId },
                  'Failed to fetch new order details after Realtime INSERT'
                );
              });
          } else if (payload.eventType === 'UPDATE' && newOrderId) {
            // Order updated (status change)
            // Fetch full order details to ensure all fields (like pickupSlotStart) are preserved
            fetchOrderDetails(newOrderId).then((updatedOrder) => {
              if (updatedOrder) {
                setOrders((prev) =>
                  prev.map((order) =>
                    order.id === updatedOrder.id ? (updatedOrder as T) : order
                  )
                );
              } else {
                // Fallback: merge with existing order data if fetch fails
                const updatedData =
                  payload.new && typeof payload.new === 'object'
                    ? (payload.new as any)
                    : {};
                setOrders((prev) =>
                  prev.map((order) =>
                    order.id === newOrderId
                      ? { ...order, ...updatedData }
                      : order
                  )
                );
              }
            });
          } else if (payload.eventType === 'DELETE') {
            // Order deleted/cancelled
            const oldOrderId =
              payload.old &&
                typeof payload.old === 'object' &&
                'id' in payload.old
                ? (payload.old as any).id
                : null;

            if (oldOrderId) {
              setOrders((prev) =>
                prev.filter((order) => order.id !== oldOrderId)
              );
            }
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          logger.info({ restaurantId }, 'Subscribed to realtime orders');
        } else if (status === 'CHANNEL_ERROR') {
          // Only log as warning, not error, since we handle it gracefully
          logger.warn(
            {
              restaurantId,
              error: err,
              status,
              message:
                'Realtime subscription error - orders will still be shown from initial fetch. This is normal if Realtime is not enabled in Supabase.',
            },
            'Realtime subscription error (non-critical)'
          );
          // Don't clear orders on error - keep showing initial orders
          // The error might be due to Realtime not being enabled in Supabase
          // but we can still show orders from the initial fetch
        } else if (status === 'TIMED_OUT') {
          logger.warn(
            { restaurantId },
            'Realtime subscription timed out - orders will still be shown from initial fetch'
          );
        } else if (status === 'CLOSED') {
          logger.info({ restaurantId }, 'Realtime subscription closed');
        }
      });

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
      setIsInitialized(false);
    };
  }, [restaurantId]);

  return orders;
}

/**
 * Fetch full order details when a new order is created
 */
async function fetchOrderDetails(
  orderId: string
): Promise<RealtimeOrder | null> {
  try {
    const response = await fetch(`/api/orders/${orderId}`);
    const data = await response.json();

    return data.success ? data.data : null;
  } catch (error) {
    logger.error({ error, orderId }, 'Failed to fetch order details');
    return null;
  }
}
