'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../../components/layout/Header';
import { useAuth } from '../../../providers/AuthProvider';
import { supabase } from '../../../providers/AuthProvider';
import { Loader2, Plus, Edit, X, LayoutGrid } from 'lucide-react';

interface TableRow {
  id: string;
  name: string;
  capacity: number;
  price?: number | null;
  description?: string | null;
  eventId?: string | null;
  isActive: boolean;
}

interface EventOpt {
  id: string;
  name: string;
}

export default function AdminTablesPage() {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<'permanent' | 'event'>('permanent');
  const [events, setEvents] = useState<EventOpt[]>([]);
  const [eventFilter, setEventFilter] = useState('');
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TableRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    capacity: '4',
    price: '',
    description: '',
    eventId: '' as string,
    isActive: true,
  });

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
      loadEvents();
    }
  }, [user, userRole, authLoading, router]);

  useEffect(() => {
    if (!authLoading && userRole === 'restaurant_admin') {
      loadTables();
    }
  }, [tab, eventFilter, authLoading, userRole]);

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

  async function loadEvents() {
    try {
      const res = await fetch('/api/admin/events', { headers: await authHeaders() });
      const json = await res.json();
      if (json.success) setEvents(json.data.events.map((e: { id: string; name: string }) => ({ id: e.id, name: e.name })));
    } catch (e) {
      console.error(e);
    }
  }

  async function loadTables() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab === 'permanent') params.set('eventId', '');
      else if (eventFilter) params.set('eventId', eventFilter);
      const res = await fetch(`/api/admin/tables?${params}`, {
        headers: await authHeaders(),
      });
      const json = await res.json();
      if (json.success) setTables(json.data.tables);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function openModal(t?: TableRow) {
    if (t) {
      setEditing(t);
      setForm({
        name: t.name,
        capacity: String(t.capacity),
        price: t.price != null ? String(t.price / 100) : '',
        description: t.description || '',
        eventId: t.eventId || '',
        isActive: t.isActive,
      });
    } else {
      setEditing(null);
      setForm({
        name: '',
        capacity: '4',
        price: '',
        description: '',
        eventId: tab === 'event' ? eventFilter : '',
        isActive: true,
      });
    }
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const headers = await authHeaders();
      const payload = {
        name: form.name,
        capacity: parseInt(form.capacity, 10),
        price: form.price
          ? Math.round(parseFloat(form.price) * 100)
          : null,
        description: form.description || null,
        eventId: form.eventId || null,
        isActive: form.isActive,
      };
      const url = editing
        ? `/api/admin/tables/${editing.id}`
        : '/api/admin/tables';
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Error');
      setShowModal(false);
      await loadTables();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    } finally {
      setSubmitting(false);
    }
  }

  async function deactivate(t: TableRow) {
    if (!confirm(`¿Desactivar mesa "${t.name}"?`)) return;
    const res = await fetch(`/api/admin/tables/${t.id}`, {
      method: 'DELETE',
      headers: await authHeaders(),
    });
    const json = await res.json();
    if (json.success) await loadTables();
    else alert(json.error);
  }

  if (authLoading || (loading && !tables.length && tab === 'permanent')) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Mesas" showBack />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <h1 className="text-2xl font-bold">Mesas</h1>
          <div className="flex rounded-lg border bg-white p-1">
            <button
              type="button"
              className={`rounded-md px-3 py-1 text-sm ${tab === 'permanent' ? 'bg-primary-600 text-white' : ''}`}
              onClick={() => setTab('permanent')}
            >
              Permanentes
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1 text-sm ${tab === 'event' ? 'bg-primary-600 text-white' : ''}`}
              onClick={() => setTab('event')}
            >
              Por evento
            </button>
          </div>
        </div>

        {tab === 'event' && (
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Evento</label>
            <select
              className="input w-full max-w-md"
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
            >
              <option value="">Selecciona evento</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="button"
          onClick={() => openModal()}
          className="btn-primary mb-4 inline-flex items-center gap-2"
          disabled={tab === 'event' && !eventFilter}
        >
          <Plus className="h-4 w-4" />
          Nueva mesa
        </button>

        <div className="space-y-3">
          {tables.map((t) => (
            <div
              key={t.id}
              className={`card flex flex-col justify-between gap-2 sm:flex-row sm:items-center ${!t.isActive ? 'opacity-60' : ''}`}
            >
              <div className="flex gap-3">
                <LayoutGrid className="mt-1 h-6 w-6 text-primary-600" />
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-sm text-gray-600">
                    Capacidad {t.capacity}
                    {t.price != null &&
                      ` · ${(t.price / 100).toLocaleString('es-CO')} COP`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={() => openModal(t)}
                >
                  <Edit className="mr-1 inline h-4 w-4" />
                  Editar
                </button>
                <button
                  type="button"
                  className="btn-secondary text-sm text-red-600"
                  onClick={() => deactivate(t)}
                >
                  Desactivar
                </button>
              </div>
            </div>
          ))}
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  {editing ? 'Editar mesa' : 'Nueva mesa'}
                </h2>
                <button type="button" onClick={() => setShowModal(false)}>
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  className="input w-full"
                  placeholder="Nombre"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <input
                  type="number"
                  className="input w-full"
                  placeholder="Capacidad"
                  required
                  min={1}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                />
                <input
                  type="number"
                  className="input w-full"
                  placeholder="Precio reserva (COP)"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
                <textarea
                  className="input w-full"
                  placeholder="Descripción"
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
                <div>
                  <label className="mb-1 block text-xs text-gray-600">
                    Evento (vacío = permanente)
                  </label>
                  <select
                    className="input w-full"
                    value={form.eventId}
                    onChange={(e) => setForm({ ...form, eventId: e.target.value })}
                  >
                    <option value="">Ninguno</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.name}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm({ ...form, isActive: e.target.checked })
                    }
                  />
                  Activa
                </label>
                <button type="submit" className="btn-primary w-full" disabled={submitting}>
                  {submitting ? 'Guardando…' : 'Guardar'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
