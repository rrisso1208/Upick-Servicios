'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../../components/layout/Header';
import { useAuth } from '../../../providers/AuthProvider';
import { supabase } from '../../../providers/AuthProvider';
import { Loader2, QrCode } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TicketRow {
  id: string;
  quantity: number;
  unitPrice: number;
  status: string;
  usedAt: string | null;
  createdAt: string;
  user: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  };
}

export default function AdminTicketsPage() {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<{ id: string; name: string; date: string }[]>(
    []
  );
  const [eventId, setEventId] = useState('');
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [soldCount, setSoldCount] = useState(0);
  const [eventLabel, setEventLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanId, setScanId] = useState('');
  const [scanMsg, setScanMsg] = useState<{ ok: boolean; text: string } | null>(
    null
  );
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
        return;
      }
      if (userRole !== 'restaurant_admin') {
        router.push('/');
        return;
      }
      (async () => {
        const h = await authHeaders();
        const r = await fetch('/api/admin/events', { headers: h });
        const j = await r.json();
        if (j.success) setEvents(j.data.events);
      })();
    }
  }, [user, userRole, authLoading, router]);

  useEffect(() => {
    if (!eventId || authLoading || userRole !== 'restaurant_admin') return;
    loadTickets();
  }, [eventId, authLoading, userRole]);

  async function authHeaders(): Promise<HeadersInit> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const h: HeadersInit = { 'Content-Type': 'application/json' };
    if (session?.access_token) {
      h['Authorization'] = `Bearer ${session.access_token}`;
    }
    return h;
  }

  async function loadTickets() {
    setLoading(true);
    setScanMsg(null);
    try {
      const res = await fetch(
        `/api/admin/tickets?eventId=${encodeURIComponent(eventId)}`,
        { headers: await authHeaders() }
      );
      const json = await res.json();
      if (json.success) {
        setTickets(json.data.tickets);
        setSoldCount(json.data.soldCount ?? 0);
        const ev = json.data.event;
        setEventLabel(ev?.name || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    const id = scanId.trim();
    if (!id) return;
    setScanning(true);
    setScanMsg(null);
    try {
      const res = await fetch(`/api/admin/tickets/${encodeURIComponent(id)}/scan`, {
        method: 'POST',
        headers: await authHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        setScanMsg({ ok: true, text: 'Entrada validada correctamente.' });
        setScanId('');
        await loadTickets();
      } else {
        setScanMsg({
          ok: false,
          text: json.error || 'No se pudo validar la entrada.',
        });
      }
    } catch {
      setScanMsg({ ok: false, text: 'Error de red.' });
    } finally {
      setScanning(false);
    }
  }

  function formatMoney(cents: number) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(cents / 100);
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Boletas" showBack />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-bold">Boletas vendidas</h1>
        <p className="mb-6 text-sm text-gray-600">
          Lista por evento y validación de entradas en la puerta (ID de la boleta).
        </p>

        <div className="mb-6 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Evento
            </label>
            <select
              className="input min-w-[220px]"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            >
              <option value="">Selecciona un evento</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} —{' '}
                  {format(new Date(ev.date), "d MMM yyyy", { locale: es })}
                </option>
              ))}
            </select>
          </div>
          {eventId && (
            <p className="text-sm text-gray-600">
              Entradas vendidas (pagadas o usadas):{' '}
              <strong>{soldCount}</strong>
            </p>
          )}
        </div>

        <section className="mb-8 rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <QrCode className="h-5 w-5" />
            Validar entrada
          </h2>
          <form onSubmit={handleScan} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1">
              <label className="mb-1 block text-xs text-gray-600">
                ID de boleta (código interno)
              </label>
              <input
                className="input w-full font-mono text-sm"
                value={scanId}
                onChange={(e) => setScanId(e.target.value)}
                placeholder="Pega el ID desde el correo o el detalle"
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              disabled={scanning || !scanId.trim()}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {scanning ? 'Validando…' : 'Marcar como usada'}
            </button>
          </form>
          {scanMsg && (
            <p
              className={`mt-3 text-sm ${scanMsg.ok ? 'text-green-700' : 'text-red-600'}`}
            >
              {scanMsg.text}
            </p>
          )}
        </section>

        {!eventId ? (
          <p className="text-gray-500">Elige un evento para ver las boletas.</p>
        ) : loading ? (
          <Loader2 className="h-8 w-8 animate-spin" />
        ) : (
          <>
            <p className="mb-2 text-sm text-gray-600">
              Evento: <strong>{eventLabel}</strong>
            </p>
            <div className="overflow-x-auto rounded-lg border bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Usuario</th>
                    <th className="p-3">Cantidad</th>
                    <th className="p-3">Precio u.</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Usada</th>
                    <th className="p-3">Creada</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id} className="border-b">
                      <td className="p-3 font-mono text-xs">{t.id}</td>
                      <td className="p-3">
                        {t.user.firstName || t.user.email}
                      </td>
                      <td className="p-3">{t.quantity}</td>
                      <td className="p-3">{formatMoney(t.unitPrice)}</td>
                      <td className="p-3">{t.status}</td>
                      <td className="p-3">
                        {t.usedAt
                          ? format(new Date(t.usedAt), "dd/MM/yyyy HH:mm", {
                              locale: es,
                            })
                          : '—'}
                      </td>
                      <td className="p-3 text-xs text-gray-600">
                        {format(new Date(t.createdAt), "dd/MM/yyyy HH:mm", {
                          locale: es,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
