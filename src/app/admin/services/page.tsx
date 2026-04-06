'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../../components/layout/Header';
import { useAuth } from '../../../providers/AuthProvider';
import { supabase } from '../../../providers/AuthProvider';
import { Loader2, Plus, Edit, X, Sparkles, Upload, Image as ImageIcon } from 'lucide-react';

async function uploadImageFile(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', 'services');

  try {
    const res = await fetch('/api/upload/image', {
      method: 'POST',
      body: formData,
    });
    const json = await res.json();
    if (json.success) return json.data.url;
    return null;
  } catch (e) {
    console.error('Upload error:', e);
    return null;
  }
}

interface ServiceRow {
  id: string;
  name: string;
  description?: string | null;
  durationMin: number;
  price: number;
  isActive: boolean;
}

export default function AdminServicesPage() {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    imageUrl: '',
    durationMin: '30',
    price: '',
    isActive: true,
    specifications: [] as { name: string; imageUrl: string; imageFile?: File | null; isBlocking: boolean }[],
    imageFile: null as File | null,
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
      const res = await fetch('/api/admin/services', {
        headers: await authHeaders(),
      });
      const json = await res.json();
      if (json.success) setRows(json.data.services);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({
      name: '',
      description: '',
      imageUrl: '',
      durationMin: '30',
      price: '',
      isActive: true,
      specifications: [],
      imageFile: null,
    });
    setShowModal(true);
  }

  function openEdit(s: any) {
    setEditing(s);
    setForm({
      name: s.name,
      description: s.description || '',
      imageUrl: s.imageUrl || '',
      durationMin: String(s.durationMin),
      price: String(Math.round(s.price / 100)),
      isActive: s.isActive,
      specifications: s.specifications ? s.specifications.map((sp: any) => ({
        name: sp.name,
        imageUrl: sp.imageUrl || '',
        isBlocking: sp.isBlocking,
      })) : [],
      imageFile: null,
    });
    setShowModal(true);
  }

  function addSpec() {
    setForm({
      ...form,
      specifications: [...form.specifications, { name: '', imageUrl: '', isBlocking: true }],
    });
  }

  function removeSpec(index: number) {
    const next = [...form.specifications];
    next.splice(index, 1);
    setForm({ ...form, specifications: next });
  }

  function updateSpec(index: number, field: string, value: any) {
    const next = [...form.specifications];
    next[index] = { ...next[index], [field]: value };
    setForm({ ...form, specifications: next });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      // 1. Upload main image if exists
      let finalImageUrl = form.imageUrl.trim() || null;
      if (form.imageFile) {
        const uploaded = await uploadImageFile(form.imageFile);
        if (uploaded) finalImageUrl = uploaded;
      }

      // 2. Upload spec images if exist
      const finalSpecs = await Promise.all(form.specifications.map(async (s) => {
        let specUrl = s.imageUrl.trim() || null;
        if (s.imageFile) {
          const uploaded = await uploadImageFile(s.imageFile);
          if (uploaded) specUrl = uploaded;
        }
        return {
          name: s.name.trim(),
          imageUrl: specUrl,
          isBlocking: s.isBlocking
        };
      }));

      const raw = form.price.replace(/[^\d.]/g, '');
      const priceCents = Math.round(Number(raw) * 100);
      if (!Number.isFinite(priceCents) || priceCents < 0) {
        alert('Precio inválido');
        setSubmitting(false);
        return;
      }
      const durationMin = Math.max(1, parseInt(form.durationMin, 10) || 15);
      
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        imageUrl: finalImageUrl,
        durationMin,
        price: priceCents,
        isActive: form.isActive,
        specifications: finalSpecs.filter(s => s.name.trim() !== ''),
      };

      if (editing) {
        const res = await fetch(`/api/admin/services/${editing.id}`, {
          method: 'PUT',
          headers: await authHeaders(),
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!json.success) {
          alert(json.error || 'Error al guardar');
          setSubmitting(false);
          return;
        }
      } else {
        const res = await fetch('/api/admin/services', {
          method: 'POST',
          headers: await authHeaders(),
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!json.success) {
          alert(json.error || 'Error al crear');
          setSubmitting(false);
          return;
        }
      }
      setShowModal(false);
      await load();
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  }

  async function deactivate(s: ServiceRow) {
    if (!confirm('¿Desactivar este servicio?')) return;
    const res = await fetch(`/api/admin/services/${s.id}`, {
      method: 'DELETE',
      headers: await authHeaders(),
    });
    const json = await res.json();
    if (!json.success) alert(json.error || 'Error');
    else await load();
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
      <Header title="Servicios" showBack />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Servicios ofrecidos</h1>
            <p className="text-sm text-gray-600">
              Gestione sus servicios, imágenes y especificaciones de profesionales.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Nuevo
          </button>
        </div>

        {loading ? (
          <div className="flex py-20 justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100">
             <Sparkles className="h-12 w-12 text-gray-200 mx-auto mb-3" />
             <p className="text-gray-500">Aún no hay servicios creados.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {rows.map((s) => (
              <li
                key={s.id}
                className="group relative flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                   {(s as any).imageUrl ? (
                     <img src={(s as any).imageUrl} alt={s.name} className="h-16 w-16 rounded-xl object-cover" />
                   ) : (
                     <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                        <Sparkles className="h-8 w-8" />
                     </div>
                   )}
                  <div>
                    <h3 className="font-bold text-lg">
                      {s.name}{' '}
                      {!s.isActive && (
                        <span className="text-xs font-normal text-red-400 bg-red-50 px-2 py-0.5 rounded-full ml-2">
                          Inactivo
                        </span>
                      )}
                    </h3>
                    {s.description && (
                      <p className="text-sm text-gray-600 line-clamp-1">{s.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                       <span className="flex items-center gap-1">
                          <Edit className="h-3.5 w-3.5" />
                          {s.durationMin} min
                       </span>
                       <span className="font-bold text-primary-600">{formatMoney(s.price)}</span>
                       {(s as any).specifications?.length > 0 && (
                         <span className="text-xs italic">
                           {(s as any).specifications.length} especificaciones
                         </span>
                       )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(s)}
                    className="rounded-xl border p-2.5 text-gray-600 hover:bg-gray-50 hover:text-primary-600 transition-colors"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  {s.isActive && (
                    <button
                      type="button"
                      onClick={() => deactivate(s)}
                      className="rounded-xl border border-red-100 p-2.5 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <form
              onSubmit={handleSubmit}
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl animate-in fade-in zoom-in duration-200"
            >
              <div className="mb-6 flex justify-between items-center">
                 <h2 className="text-2xl font-black text-gray-900">
                   {editing ? 'Editar servicio' : 'Nuevo servicio'}
                 </h2>
                 <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-6 w-6" />
                 </button>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                 <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-gray-700">Nombre del Servicio</label>
                      <input
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition-all focus:border-primary-600 focus:bg-white"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Ej. Corte de Cabello"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-gray-700">Descripción</label>
                      <textarea
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition-all focus:border-primary-600 focus:bg-white min-h-[100px]"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="Breve descripción del servicio..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-700">Imagen del Servicio</label>
                      <div className="flex items-center gap-4">
                        <div className="relative group h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center transition-all hover:border-primary-400">
                          {form.imageFile || form.imageUrl ? (
                            <img 
                              src={form.imageFile ? URL.createObjectURL(form.imageFile) : form.imageUrl} 
                              className="h-full w-full object-cover" 
                              alt="preview" 
                            />
                          ) : (
                            <ImageIcon className="h-8 w-8 text-gray-300" />
                          )}
                          <label className="absolute inset-0 z-10 hidden cursor-pointer items-center justify-center bg-black/40 text-white group-hover:flex">
                             <Upload className="h-5 w-5" />
                             <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onChange={(e) => setForm({ ...form, imageFile: e.target.files?.[0] || null })}
                             />
                          </label>
                        </div>
                        <div className="flex-1 space-y-2">
                           <input
                             className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-xs outline-none focus:border-primary-500 focus:bg-white"
                             value={form.imageUrl}
                             onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                             placeholder="O pega una URL..."
                           />
                           <p className="text-[10px] text-gray-400 font-medium">Recomendado: 800x600px (4:3)</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className="mb-1.5 block text-sm font-bold text-gray-700">Duración (min)</label>
                         <input
                           type="number"
                           className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition-all focus:border-primary-600 focus:bg-white"
                           value={form.durationMin}
                           onChange={(e) => setForm({ ...form, durationMin: e.target.value })}
                         />
                       </div>
                       <div>
                         <label className="mb-1.5 block text-sm font-bold text-gray-700">Precio (COP)</label>
                         <input
                           className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition-all focus:border-primary-600 focus:bg-white"
                           value={form.price}
                           onChange={(e) => setForm({ ...form, price: e.target.value })}
                           placeholder="50000"
                         />
                       </div>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <h3 className="text-lg font-bold text-gray-900">Especificaciones</h3>
                       <button
                          type="button"
                          onClick={addSpec}
                          className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                       >
                          <Plus className="h-3 w-3" />
                          Añadir profesional/variante
                       </button>
                    </div>
                    
                     <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                        {form.specifications.map((spec, i) => (
                           <div key={i} className="rounded-2xl border border-gray-100 bg-gray-50 p-4 relative group">
                              <button
                                 type="button"
                                 onClick={() => removeSpec(i)}
                                 className="absolute -top-2 -right-2 bg-white border border-gray-200 text-gray-400 rounded-full p-1 hover:text-red-600 shadow-sm z-10"
                              >
                                 <X className="h-3 w-3" />
                              </button>
                              <div className="space-y-3">
                                 <input
                                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-primary-500"
                                    placeholder="Nombre del Profesional (ej. Juan Perez)"
                                    value={spec.name}
                                    onChange={(e) => updateSpec(i, 'name', e.target.value)}
                                 />
                                 <div className="flex items-center gap-2">
                                    <div className="relative group h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white flex items-center justify-center">
                                       {spec.imageFile || spec.imageUrl ? (
                                          <img 
                                             src={spec.imageFile ? URL.createObjectURL(spec.imageFile) : spec.imageUrl} 
                                             className="h-full w-full object-cover" 
                                             alt="spec" 
                                          />
                                       ) : (
                                          <ImageIcon className="h-4 w-4 text-gray-200" />
                                       )}
                                       <label className="absolute inset-0 z-10 hidden cursor-pointer items-center justify-center bg-black/40 text-white group-hover:flex">
                                          <input 
                                             type="file" 
                                             className="hidden" 
                                             accept="image/*"
                                             onChange={(e) => updateSpec(i, 'imageFile', e.target.files?.[0] || null)}
                                          />
                                          <Upload className="h-3 w-3" />
                                       </label>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                       <input
                                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[10px] outline-none focus:border-primary-500"
                                          placeholder="O pega una URL..."
                                          value={spec.imageUrl}
                                          onChange={(e) => updateSpec(i, 'imageUrl', e.target.value)}
                                       />
                                    </div>
                                 </div>
                                 <label className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                                    <input
                                       type="checkbox"
                                       checked={spec.isBlocking}
                                       onChange={(e) => updateSpec(i, 'isBlocking', e.target.checked)}
                                       className="rounded text-primary-600"
                                    />
                                    Bloquear horario (Cita privada)
                                 </label>
                              </div>
                           </div>
                        ))}
                       {form.specifications.length === 0 && (
                          <p className="text-center py-4 text-xs text-gray-400 italic">
                             Sin especificaciones. El servicio será asignado de forma general.
                          </p>
                       )}
                    </div>
                 </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 border-t pt-6">
                 <button
                   type="button"
                   className="rounded-xl border px-6 py-3 font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                   onClick={() => setShowModal(false)}
                 >
                   Cancelar
                 </button>
                 <button
                   type="submit"
                   disabled={submitting}
                   className="rounded-xl bg-primary-600 px-8 py-3 font-bold text-white shadow-xl shadow-primary-100 hover:bg-primary-700 disabled:opacity-50 transition-all active:scale-95"
                 >
                   {submitting ? 'Guardando…' : 'Guardar Servicio'}
                 </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
