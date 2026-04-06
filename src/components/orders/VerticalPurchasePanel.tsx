'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase, useAuth } from '@/providers/AuthProvider';
import { QRDisplay } from '@/components/QRDisplay';
import { Loader2, CheckCircle2, XCircle, X } from 'lucide-react';

interface TicketPayload {
  ticket: {
    id: string;
    status: string;
    qrCode: string | null;
    usedAt: string | null;
    quantity: number;
  };
  event: {
    id: string;
    name: string;
    date: string;
    bannerUrl: string | null;
    restaurantId: string;
  };
  canShowQr: boolean;
}

interface ServicePayload {
  reservation: {
    id: string;
    status: string;
    qrCode: string | null;
  };
  serviceName: string;
  restaurant: { name: string };
  slot: { startTime: string; endTime: string };
  canShowQr: boolean;
}

interface TablePayload {
  reservation: {
    id: string;
    status: string;
    qrCode: string | null;
    guestCount: number;
    createdAt: string;
  };
  tableName: string;
  restaurant: { name: string };
  event: {
    id: string;
    name: string;
    date: string;
    bannerUrl: string | null;
  } | null;
  canShowQr: boolean;
}

function encodeQr(kind: 'ticket' | 'service' | 'table', id: string, code: string) {
  return JSON.stringify({ t: kind, id, c: code });
}

export function VerticalPurchasePanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userRole, loading: authLoading } = useAuth();
  const ticketId = searchParams.get('ticket');
  const serviceReservationId = searchParams.get('serviceReservation');
  const tableReservationId = searchParams.get('tableReservation');

  const active = useMemo(() => {
    if (ticketId) return { kind: 'ticket' as const, id: ticketId };
    if (serviceReservationId)
      return { kind: 'service' as const, id: serviceReservationId };
    if (tableReservationId)
      return { kind: 'table' as const, id: tableReservationId };
    return null;
  }, [ticketId, serviceReservationId, tableReservationId]);

  const [loading, setLoading] = useState(!!active);
  const [error, setError] = useState<string | null>(null);
  const [ticketData, setTicketData] = useState<TicketPayload | null>(null);
  const [serviceData, setServiceData] = useState<ServicePayload | null>(null);
  const [tableData, setTableData] = useState<TablePayload | null>(null);

  const authHeaders = useCallback(async (): Promise<HeadersInit> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const h: HeadersInit = { 'Content-Type': 'application/json' };
    if (session?.access_token) {
      h.Authorization = `Bearer ${session.access_token}`;
    }
    return h;
  }, []);

  const load = useCallback(async () => {
    if (!active) return;
    setError(null);
    setLoading(true);
    try {
      const headers = await authHeaders();
      if (active.kind === 'ticket') {
        const res = await fetch(`/api/client/tickets/${active.id}`, {
          headers,
          credentials: 'include',
        });
        const json = await res.json();
        if (!json.success) {
          setError(json.error || 'No se pudo cargar la boleta');
          setTicketData(null);
          return;
        }
        setTicketData(json.data);
        setServiceData(null);
        setTableData(null);
      } else if (active.kind === 'service') {
        const res = await fetch(`/api/client/service-reservations/${active.id}`, {
          headers,
          credentials: 'include',
        });
        const json = await res.json();
        if (!json.success) {
          setError(json.error || 'No se pudo cargar la reserva');
          setServiceData(null);
          return;
        }
        setServiceData(json.data);
        setTicketData(null);
        setTableData(null);
      } else {
        const res = await fetch(`/api/client/table-reservations/${active.id}`, {
          headers,
          credentials: 'include',
        });
        const json = await res.json();
        if (!json.success) {
          setError(json.error || 'No se pudo cargar la reserva');
          setTableData(null);
          return;
        }
        setTableData(json.data);
        setTicketData(null);
        setServiceData(null);
      }
    } catch {
      setError('Error de red');
    } finally {
      setLoading(false);
    }
  }, [active, authHeaders]);

  useEffect(() => {
    if (!active || authLoading || !user || userRole !== 'student') return;
    load();
  }, [active, load, authLoading, user, userRole]);

  const pendingPayment = useMemo(() => {
    if (!active) return false;
    if (active.kind === 'ticket') {
      return ticketData?.ticket.status === 'PENDING_PAYMENT';
    }
    if (active.kind === 'service') {
      return serviceData?.reservation.status === 'PENDING_PAYMENT';
    }
    return tableData?.reservation.status === 'PENDING_PAYMENT';
  }, [active, ticketData, serviceData, tableData]);

  useEffect(() => {
    if (!active || !pendingPayment || userRole !== 'student') return;
    const t = setInterval(() => {
      load();
    }, 2800);
    return () => clearInterval(t);
  }, [active, pendingPayment, load, userRole]);

  const clearQuery = () => {
    router.replace('/orders');
  };

  if (!active) return null;
  if (authLoading || !user) return null;
  if (userRole !== 'student') return null;

  return (
    <div className="card relative mb-6 border-2 border-primary-200 bg-primary-50/40">
      <button
        type="button"
        onClick={clearQuery}
        className="absolute right-3 top-3 rounded-full p-1 text-gray-500 hover:bg-white/80"
        aria-label="Cerrar"
      >
        <X className="h-5 w-5" />
      </button>

      <h2 className="pr-10 text-lg font-semibold text-gray-900">
        {active.kind === 'ticket' && 'Tu compra de boleta'}
        {active.kind === 'service' && 'Tu reserva de servicio'}
        {active.kind === 'table' && 'Tu reserva de mesa'}
      </h2>

      {loading && !ticketData && !serviceData && !tableData && (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando…
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!error && pendingPayment && (
        <div className="mt-4 flex items-center gap-3 rounded-lg bg-amber-50 p-4 text-amber-950">
          <Loader2 className="h-6 w-6 shrink-0 animate-spin text-amber-700" />
          <div>
            <p className="font-medium">Esperando confirmación de pago</p>
            <p className="mt-1 text-sm text-amber-900/90">
              Si ya pagaste en Wompi, esto puede tardar unos segundos. No cierres
              esta página.
            </p>
          </div>
        </div>
      )}

      {active.kind === 'ticket' &&
        ticketData &&
        !pendingPayment &&
        ticketData.canShowQr &&
        ticketData.ticket.qrCode && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-green-800">
              <CheckCircle2 className="h-5 w-5" />
              Pago confirmado — cantidad: {ticketData.ticket.quantity}
            </div>
            <QRDisplay
              variant="discoteca"
              value={encodeQr(
                'ticket',
                ticketData.ticket.id,
                ticketData.ticket.qrCode
              )}
              eventName={ticketData.event.name}
              eventBannerUrl={ticketData.event.bannerUrl}
              scanned={!!ticketData.ticket.usedAt}
              scannedAt={ticketData.ticket.usedAt}
            />
            <p className="text-center text-xs text-gray-500">
              Actualizamos el estado si la entrada ya fue validada en la puerta.
            </p>
            <button
              type="button"
              onClick={() => load()}
              className="btn-secondary mx-auto block text-sm"
            >
              Actualizar estado
            </button>
          </div>
        )}

      {active.kind === 'service' &&
        serviceData &&
        serviceData.canShowQr &&
        serviceData.reservation.qrCode && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-green-800">
              <CheckCircle2 className="h-5 w-5" />
              Reserva confirmada — {serviceData.restaurant.name}
            </div>
            <QRDisplay
              variant="service"
              value={encodeQr(
                'service',
                serviceData.reservation.id,
                serviceData.reservation.qrCode
              )}
              serviceName={serviceData.serviceName}
              serviceDate={serviceData.slot.startTime}
              serviceStartTime={serviceData.slot.startTime}
              serviceEndTime={serviceData.slot.endTime}
            />
          </div>
        )}

      {active.kind === 'table' &&
        tableData &&
        tableData.canShowQr &&
        tableData.reservation.qrCode && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-green-800">
              <CheckCircle2 className="h-5 w-5" />
              Reserva confirmada — {tableData.restaurant.name}
            </div>
            <QRDisplay
              variant="service"
              value={encodeQr(
                'table',
                tableData.reservation.id,
                tableData.reservation.qrCode
              )}
              serviceName={`Mesa ${tableData.tableName} · ${tableData.reservation.guestCount} pers.`}
              serviceDate={
                tableData.event?.date ?? tableData.reservation.createdAt
              }
              serviceStartTime={tableData.event?.date}
            />
            {tableData.event && (
              <p className="text-center text-sm text-gray-600">
                Evento: {tableData.event.name}
              </p>
            )}
          </div>
        )}

      {active.kind === 'service' &&
        serviceData &&
        serviceData.reservation.status === 'CANCELLED' && (
          <p className="mt-4 text-sm text-gray-600">Esta reserva fue cancelada.</p>
        )}

      {active.kind === 'table' &&
        tableData &&
        tableData.reservation.status === 'CANCELLED' && (
          <p className="mt-4 text-sm text-gray-600">Esta reserva fue cancelada.</p>
        )}
    </div>
  );
}
