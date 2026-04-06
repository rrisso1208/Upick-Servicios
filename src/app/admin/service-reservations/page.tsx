'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../../components/layout/Header';
import { useAuth } from '../../../providers/AuthProvider';
import { supabase } from '../../../providers/AuthProvider';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReservationRow {
  id: string;
  status: string;
  createdAt: string;
  user: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    phoneNumber?: string | null;
  };
  slot: {
    startTime: string;
    endTime: string;
    serviceOffering: { id: string; name: string; durationMin: number };
  };
}

export default function AdminServiceReservationsPage() {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

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
    }
  }, [user, userRole, authLoading, router]);

  useEffect(() => {
    if (!authLoading && userRole === 'restaurant_admin') load();
  }, [status, authLoading, userRole]);

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

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      const res = await fetch(`/api/admin/service-reservations?${params}`, {
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

  async function markNoShow(id: string) {
    if (!confirm('¿Marcar como no asistió?')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/service-reservations/${id}`, {
        method: 'PUT',
        headers: await authHeaders(),
        body: JSON.stringify({ status: 'NO_SHOW' }),
      });
      const json = await res.json();
      if (!json.success) alert(json.error || 'Error');
      else await load();
    } finally {
      setBusyId(null);
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
      <Header title="Reservas de servicio" showBack />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold">Reservas de servicio</h1>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Estado
          </label>
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="PENDING_PAYMENT">Pago pendiente</option>
            <option value="CONFIRMED">Confirmada</option>
            <option value="CANCELLED">Cancelada</option>
            <option value="NO_SHOW">No asistió</option>
          </select>
        </div>

        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin" />
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Servicio</th>
                  <th className="p-3">Inicio</th>
                  <th className="p-3">Fin</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Reservado</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="p-3">
                      <div>
                        {r.user.firstName || r.user.email}
                        {r.user.phoneNumber && (
                          <div className="text-xs text-gray-500">
                            {r.user.phoneNumber}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">{r.slot.serviceOffering.name}</td>
                    <td className="p-3">
                      {format(new Date(r.slot.startTime), "dd/MM/yyyy HH:mm", {
                        locale: es,
                      })}
                    </td>
                    <td className="p-3">
                      {format(new Date(r.slot.endTime), 'HH:mm')}
                    </td>
                    <td className="p-3">{r.status}</td>
                    <td className="p-3 text-xs text-gray-600">
                      {format(new Date(r.createdAt), "dd/MM/yyyy HH:mm", {
                        locale: es,
                      })}
                    </td>
                    <td className="p-3">
                      {r.status === 'CONFIRMED' && (
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => markNoShow(r.id)}
                          className="rounded border px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          No asistió
                        </button>
                      )}
                    </td>
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
