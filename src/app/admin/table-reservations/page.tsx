'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../../components/layout/Header';
import { useAuth } from '../../../providers/AuthProvider';
import { supabase } from '../../../providers/AuthProvider';
import { Loader2 } from 'lucide-react';
export default function AdminTableReservationsPage() {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);
  const [eventId, setEventId] = useState('');
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState<
    {
      id: string;
      guestCount: number;
      status: string;
      user: { email: string; firstName?: string | null };
      table: { name: string };
      event: { name: string } | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);

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
    if (!authLoading && userRole === 'restaurant_admin') load();
  }, [eventId, status, authLoading, userRole]);

  async function authHeaders(): Promise<HeadersInit> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const h: HeadersInit = {};
    if (session?.access_token) {
      h['Authorization'] = `Bearer ${session.access_token}`;
    }
    return h;
  }

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (eventId) params.set('eventId', eventId);
      if (status) params.set('status', status);
      const res = await fetch(`/api/admin/table-reservations?${params}`, {
        headers: await authHeaders(),
      });
      const json = await res.json();
      if (json.success) setRows(json.data.reservations);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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
      <Header title="Reservas de mesa" showBack />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold">Reservas de mesa</h1>
        <div className="mb-4 flex flex-wrap gap-3">
          <select
            className="input"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
          >
            <option value="">Todos los eventos</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="PENDING_PAYMENT">Pago pendiente</option>
            <option value="CONFIRMED">Confirmada</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
        </div>

        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin" />
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="p-3">Usuario</th>
                  <th className="p-3">Mesa</th>
                  <th className="p-3">Evento</th>
                  <th className="p-3">Invitados</th>
                  <th className="p-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="p-3">
                      {r.user.firstName || r.user.email}
                    </td>
                    <td className="p-3">{r.table.name}</td>
                    <td className="p-3">{r.event?.name || '—'}</td>
                    <td className="p-3">{r.guestCount}</td>
                    <td className="p-3">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
