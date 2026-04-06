'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../../components/layout/Header';
import { useAuth } from '../../../providers/AuthProvider';
import { supabase } from '../../../providers/AuthProvider';
import {
  Loader2,
  Plus,
  Edit,
  X,
  PartyPopper,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface EventRow {
  id: string;
  name: string;
  description?: string | null;
  date: string;
  coverPrice?: number | null;
  maxCapacity?: number | null;
  bannerUrl?: string | null;
  isActive: boolean;
}

export default function AdminEventsPage() {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    date: '',
    coverPrice: '',
    maxCapacity: '',
    bannerUrl: '',
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
      load();
    }
  }, [user, userRole, authLoading, router]);

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
    try {
      const res = await fetch('/api/admin/events', { headers: await authHeaders() });
      const json = await res.json();
      if (json.success) setEvents(json.data.events);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function openModal(ev?: EventRow) {
    if (ev) {
      setEditing(ev);
      setForm({
        name: ev.name,
        description: ev.description || '',
        date: ev.date.slice(0, 16),
        coverPrice: ev.coverPrice != null ? String(ev.coverPrice / 100) : '',
        maxCapacity: ev.maxCapacity != null ? String(ev.maxCapacity) : '',
        bannerUrl: ev.bannerUrl || '',
        isActive: ev.isActive,
      });
    } else {
      setEditing(null);
      setForm({
        name: '',
        description: '',
        date: '',
        coverPrice: '',
        maxCapacity: '',
        bannerUrl: '',
        isActive: true,
      });
    }
    setShowModal(true);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Selecciona una imagen válida');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      alert('Imagen demasiado grande (máx 4MB)');
      return;
    }

    setUploadingImage(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'events');

      const h: HeadersInit = {};
      if (session?.access_token) {
        h['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/upload/image', {
        method: 'POST',
        headers: h,
        body: fd,
      });

      const json = await res.json();
      if (json.success) {
        setForm({ ...form, bannerUrl: json.data.url });
      } else {
        alert(json.error || 'Error al subir');
      }
    } catch (err) {
      console.error(err);
      alert('Error en la subida');
    } finally {
      setUploadingImage(false);
    }
  }


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const headers = await authHeaders();
      const payload = {
        name: form.name,
        description: form.description || null,
        date: new Date(form.date).toISOString(),
        coverPrice: form.coverPrice
          ? Math.round(parseFloat(form.coverPrice) * 100)
          : null,
        maxCapacity: form.maxCapacity
          ? parseInt(form.maxCapacity, 10)
          : null,
        bannerUrl: form.bannerUrl || null,
        isActive: form.isActive,
      };
      const url = editing
        ? `/api/admin/events/${editing.id}`
        : '/api/admin/events';
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Error');
      setShowModal(false);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    } finally {
      setSubmitting(false);
    }
  }

  async function deactivate(ev: EventRow) {
    if (!confirm(`¿Desactivar evento "${ev.name}"?`)) return;
    const res = await fetch(`/api/admin/events/${ev.id}`, {
      method: 'DELETE',
      headers: await authHeaders(),
    });
    const json = await res.json();
    if (json.success) await load();
    else alert(json.error);
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Eventos" showBack />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Eventos</h1>
          <button
            type="button"
            onClick={() => openModal()}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nuevo evento
          </button>
        </div>

        <div className="space-y-3">
          {events.map((ev) => (
            <div
              key={ev.id}
              className={`card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${!ev.isActive ? 'opacity-60' : ''}`}
            >
              <div className="flex gap-3">
                <PartyPopper className="mt-1 h-6 w-6 text-primary-600" />
                <div>
                  <p className="font-semibold">{ev.name}</p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(ev.date), "d MMM yyyy HH:mm", { locale: es })}
                  </p>
                  {ev.maxCapacity != null && (
                    <p className="text-xs text-gray-500">
                      Aforo máx: {ev.maxCapacity}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={() => openModal(ev)}
                >
                  <Edit className="mr-1 inline h-4 w-4" />
                  Editar
                </button>
                <button
                  type="button"
                  className="btn-secondary text-sm text-red-600"
                  onClick={() => deactivate(ev)}
                >
                  Desactivar
                </button>
              </div>
            </div>
          ))}
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  {editing ? 'Editar evento' : 'Nuevo evento'}
                </h2>
                <button type="button" onClick={() => setShowModal(false)}>
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Nombre</label>
                  <input
                    className="input w-full"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Descripción</label>
                  <textarea
                    className="input w-full"
                    rows={3}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Fecha y hora</label>
                  <input
                    type="datetime-local"
                    className="input w-full"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Precio boleta (COP)
                  </label>
                  <input
                    type="number"
                    className="input w-full"
                    value={form.coverPrice}
                    onChange={(e) =>
                      setForm({ ...form, coverPrice: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Aforo máximo
                  </label>
                  <input
                    type="number"
                    className="input w-full"
                    value={form.maxCapacity}
                    onChange={(e) =>
                      setForm({ ...form, maxCapacity: e.target.value })
                    }
                  />
                </div>
                <div>
                   <label className="mb-1 block text-sm font-medium text-gray-700">
                     Imagen / Banner del Evento
                   </label>
                   <input
                     type="file"
                     accept="image/*"
                     onChange={handleImageUpload}
                     disabled={uploadingImage}
                     className="input w-full"
                   />
                   {uploadingImage && <p className="mt-1 text-xs text-primary-600 animate-pulse">Subiendo imagen...</p>}
                   {form.bannerUrl && (
                     <div className="mt-2 relative h-32 w-full overflow-hidden rounded-lg border">
                       <img 
                         src={form.bannerUrl} 
                         alt="Previsualización" 
                         className="h-full w-full object-cover"
                       />
                       <button
                         type="button"
                         onClick={() => setForm({ ...form, bannerUrl: '' })}
                         className="absolute top-1 right-1 p-1 bg-white/80 rounded-full text-red-600 shadow-sm"
                       >
                         <X size={16} />
                       </button>
                     </div>
                   )}
                 </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm({ ...form, isActive: e.target.checked })
                    }
                  />
                  Activo
                </label>
                <button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={submitting}
                >
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
