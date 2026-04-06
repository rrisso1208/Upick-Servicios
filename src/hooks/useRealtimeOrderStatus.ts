/**
 * Hook for students to track their order status in real-time
 */

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../providers/AuthProvider';
import { OrderStatus } from '@prisma/client';

export function useRealtimeOrderStatus(orderId: string) {
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order:${orderId}:status`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Order',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          if (payload.new.status) {
            setStatus(payload.new.status as OrderStatus);
            setLastUpdate(new Date());

            // Show browser notification if supported
            if (
              'Notification' in window &&
              Notification.permission === 'granted'
            ) {
              const statusLabels: Record<OrderStatus, string> = {
                awaiting_payment: 'Esperando pago',
                payment_failed: 'Pago fallido',
                paid: 'Pagado',
                in_progress: 'En preparación',
                ready: 'Listo para recoger',
                delivered: 'Entregado',
                cancelled: 'Cancelado',
                refunded: 'Reembolsado',
              };

              new Notification('Actualización de Pedido', {
                body: `Tu pedido está: ${statusLabels[payload.new.status as OrderStatus]}`,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  return { status, lastUpdate };
}
