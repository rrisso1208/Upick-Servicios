'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../../components/layout/Header';
import { useAuth } from '../../../providers/AuthProvider';
import { supabase } from '../../../providers/AuthProvider';
import { Loader2, Trash2, Calendar, Clock, Plus, Save, ChevronRight, ChevronLeft, X, Sparkles, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const WEEKDAYS = [
  { v: 0, label: 'Domingo' },
  { v: 1, label: 'Lunes' },
  { v: 2, label: 'Martes' },
  { v: 3, label: 'Miércoles' },
  { v: 4, label: 'Jueves' },
  { v: 5, label: 'Viernes' },
  { v: 6, label: 'Sábado' },
];

interface ScheduleRule {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  intervalMin: number;
}

interface ServiceOpt {
  id: string;
  name: string;
  specifications?: any[];
}

interface SlotRow {
  id: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  specificationId?: string | null;
}

export default function AdminServiceSchedulePage() {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  const [services, setServices] = useState<ServiceOpt[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [rules, setRules] = useState<ScheduleRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);
  const [savingRule, setSavingRule] = useState(false);
  
  const [ruleForm, setRuleForm] = useState({
    dayOfWeek: '1',
    startTime: '08:00',
    endTime: '18:00',
    intervalMin: '30',
  });

  const [manualSlotForm, setManualSlotForm] = useState({
    startTime: '08:00',
    specificationId: '',
  });

  const [addingManual, setAddingManual] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);

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
      loadServices();
    }
  }, [user, userRole, authLoading, router]);

  useEffect(() => {
    if (serviceId) {
      loadRules();
      loadSlots();
    }
  }, [serviceId]);

  useEffect(() => {
    if (serviceId && filterDate) {
      loadSlots();
    }
  }, [filterDate]);

  async function authHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    const h: HeadersInit = { 'Content-Type': 'application/json' };
    if (session?.access_token) h['Authorization'] = `Bearer ${session.access_token}`;
    return h;
  }

  async function loadServices() {
    setLoadingServices(true);
    try {
      const res = await fetch('/api/admin/services', { headers: await authHeaders() });
      const j = await res.json();
      if (j.success) {
        setServices(j.data.services);
        if (j.data.services.length > 0) setServiceId(j.data.services[0].id);
      }
    } finally {
      setLoadingServices(false);
    }
  }

  async function loadRules() {
    if (!serviceId) return;
    try {
      const res = await fetch(`/api/admin/services/${serviceId}/schedule`, { headers: await authHeaders() });
      const j = await res.json();
      if (j.success) setRules(j.data.schedules);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadSlots() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ serviceId });
      if (filterDate) params.set('date', filterDate);
      const res = await fetch(`/api/admin/timeslots?${params}`, {
        headers: await authHeaders(),
      });
      const json = await res.json();
      if (json.success) setSlots(json.data.slots);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddRule(e: React.FormEvent) {
    e.preventDefault();
    setSavingRule(true);
    try {
      const res = await fetch(`/api/admin/services/${serviceId}/schedule`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(ruleForm),
      });
      const j = await res.json();
      if (j.success) {
        await loadRules();
        setRuleForm({ ...ruleForm, dayOfWeek: (parseInt(ruleForm.dayOfWeek) % 7 + 1).toString() });
      }
    } finally {
      setSavingRule(false);
    }
  }

  async function handleAddManualSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceId) return;
    setAddingManual(true);
    try {
      const res = await fetch('/api/admin/timeslots', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          serviceId,
          date: filterDate,
          ...manualSlotForm
        }),
      });
      const j = await res.json();
      if (j.success) {
        await loadSlots();
        setShowManualForm(false);
      } else {
        alert(j.error || 'Error al crear cupo');
      }
    } finally {
      setAddingManual(false);
    }
  }

  async function deleteRule(id: string) {
    if (!confirm('¿Eliminar esta regla de horario?')) return;
    const res = await fetch(`/api/admin/services/${serviceId}/schedule?id=${id}`, {
      method: 'DELETE',
      headers: await authHeaders(),
    });
    if ((await res.json()).success) loadRules();
  }

  async function removeSlot(id: string) {
    if (!confirm('¿Eliminar este cupo manual?')) return;
    const res = await fetch(`/api/admin/timeslots?id=${id}`, { method: 'DELETE', headers: await authHeaders() });
    if ((await res.json()).success) loadSlots();
  }

  if (authLoading || loadingServices) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Disponibilidad y Cupos" showBack />
      <main className="mx-auto max-w-6xl px-4 py-8 pb-20">
        
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
           <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Agenda Recurrente</h1>
              <p className="text-gray-500 mt-1 font-medium">Define las reglas semanales para tus expertos y servicios.</p>
           </div>
           <div className="flex flex-wrap gap-4">
              <div className="relative">
                 <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-black uppercase text-primary-600">Servicio</label>
                 <select
                    className="h-12 min-w-[240px] rounded-2xl border-2 border-gray-100 bg-white px-4 font-bold outline-none focus:border-primary-600 transition-all shadow-sm"
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                 >
                    {services.map((s) => (
                       <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                 </select>
              </div>
           </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
           {/* Section: Recurring Rules */}
           <section className="lg:col-span-4 space-y-6">
              <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl shadow-gray-200/50 overflow-hidden">
                 <h2 className="mb-6 flex items-center gap-2 text-lg font-black text-gray-900">
                    <Sparkles className="h-5 w-5 text-primary-600" />
                    Nueva Regla
                 </h2>
                 <form onSubmit={handleAddRule} className="space-y-4">
                    <div>
                       <label className="mb-2 block text-xs font-black uppercase text-gray-400 tracking-wider">Día de la semana</label>
                       <select 
                          className="w-full h-12 rounded-xl border-2 border-gray-50 bg-gray-50 px-4 font-bold outline-none focus:border-primary-600 focus:bg-white transition-all"
                          value={ruleForm.dayOfWeek}
                          onChange={e => setRuleForm({...ruleForm, dayOfWeek: e.target.value})}
                       >
                          {WEEKDAYS.map(w => <option key={w.v} value={w.v}>{w.label}</option>)}
                       </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <div>
                          <label className="mb-2 block text-xs font-black uppercase text-gray-400 tracking-wider">Inicio</label>
                          <input 
                             type="time" 
                             className="w-full h-12 rounded-xl border-2 border-gray-50 bg-gray-50 px-4 font-bold outline-none focus:border-primary-600 focus:bg-white transition-all"
                             value={ruleForm.startTime}
                             onChange={e => setRuleForm({...ruleForm, startTime: e.target.value})}
                          />
                       </div>
                       <div>
                          <label className="mb-2 block text-xs font-black uppercase text-gray-400 tracking-wider">Fin</label>
                          <input 
                             type="time" 
                             className="w-full h-12 rounded-xl border-2 border-gray-50 bg-gray-50 px-4 font-bold outline-none focus:border-primary-600 focus:bg-white transition-all"
                             value={ruleForm.endTime}
                             onChange={e => setRuleForm({...ruleForm, endTime: e.target.value})}
                          />
                       </div>
                    </div>
                    <div>
                        <label className="mb-2 block text-xs font-black uppercase text-gray-400 tracking-wider">Intervalo (min)</label>
                        <input 
                          type="number" 
                          className="w-full h-12 rounded-xl border-2 border-gray-50 bg-gray-50 px-4 font-bold outline-none focus:border-primary-600 focus:bg-white transition-all"
                          value={ruleForm.intervalMin}
                          onChange={e => setRuleForm({...ruleForm, intervalMin: e.target.value})}
                        />
                    </div>
                    <button
                       type="submit"
                       disabled={savingRule || !serviceId}
                       className="w-full h-12 rounded-2xl bg-primary-600 font-black text-white shadow-xl shadow-primary-100 hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-50 mt-4"
                    >
                       {savingRule ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Añadir a la semana'}
                    </button>
                 </form>
              </div>

              {/* Rules List */}
              <div className="space-y-3">
                 <h3 className="font-black text-gray-400 uppercase text-[10px] tracking-widest px-2">Configuración Semanal</h3>
                 {rules.length === 0 ? (
                    <div className="rounded-3xl border-2 border-dashed border-gray-100 p-8 text-center text-gray-400 text-sm font-medium">
                       Sin reglas definidas aún.
                    </div>
                 ) : (
                    rules.map(rule => (
                       <div key={rule.id} className="group flex items-center justify-between rounded-3xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-all">
                          <div>
                             <p className="text-sm font-black text-gray-900">{WEEKDAYS.find(w => w.v === rule.dayOfWeek)?.label}</p>
                             <p className="text-xs font-bold text-primary-600 mt-1">
                                {rule.startTime} - {rule.endTime} <span className="text-gray-300 font-normal ml-2">/ cada {rule.intervalMin} min</span>
                             </p>
                          </div>
                          <button 
                             onClick={() => deleteRule(rule.id)}
                             className="opacity-0 group-hover:opacity-100 transition-all h-10 w-10 flex items-center justify-center rounded-full text-red-400 hover:bg-red-50"
                          >
                             <Trash2 className="h-5 w-5" />
                          </button>
                       </div>
                    ))
                 )}
              </div>
           </section>

           {/* Section: Daily Slots Preview */}
           <section className="lg:col-span-8">
              <div className="rounded-[2.5rem] border border-gray-100 bg-white p-8 shadow-xl shadow-gray-200/50">
                 <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
                    <h2 className="flex items-center gap-2 text-xl font-black text-gray-900">
                       <CalendarDays className="h-6 w-6 text-primary-600" />
                       Visión Diaria
                    </h2>
                    <div className="flex items-center gap-3">
                        <button 
                           onClick={() => setShowManualForm(!showManualForm)}
                           className={`h-10 px-4 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${
                              showManualForm 
                                 ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                                 : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                           }`}
                        >
                           {showManualForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                           {showManualForm ? 'Cancelar' : 'Slot Manual'}
                        </button>
                        <input
                           type="date"
                           className="h-10 rounded-xl border-2 border-gray-50 bg-gray-50 px-4 text-sm font-bold outline-none focus:border-primary-600 focus:bg-white transition-all shadow-sm"
                           value={filterDate}
                           onChange={(e) => setFilterDate(e.target.value)}
                        />
                    </div>
                 </div>

                 {showManualForm && (
                     <div className="mb-8 p-6 rounded-3xl bg-primary-50/50 border-2 border-primary-100/50">
                        <h4 className="text-sm font-black text-primary-600 uppercase tracking-wider mb-4">Crear Cupo Personalizado</h4>
                        <form onSubmit={handleAddManualSlot} className="flex flex-wrap items-end gap-4">
                           <div className="flex-1 min-w-[120px]">
                              <label className="mb-2 block text-[10px] font-black uppercase text-primary-400">Hora Inicio</label>
                              <input 
                                 type="time" 
                                 className="w-full h-11 rounded-xl border-2 border-white bg-white px-4 font-bold outline-none focus:border-primary-600 transition-all"
                                 value={manualSlotForm.startTime}
                                 onChange={e => setManualSlotForm({...manualSlotForm, startTime: e.target.value})}
                                 required
                              />
                           </div>
                           
                           {services.find(s => s.id === serviceId)?.specifications?.length ? (
                              <div className="flex-1 min-w-[200px]">
                                 <label className="mb-2 block text-[10px] font-black uppercase text-primary-400">Especialista (Opcional)</label>
                                 <select 
                                    className="w-full h-11 rounded-xl border-2 border-white bg-white px-4 font-bold outline-none focus:border-primary-600 transition-all"
                                    value={manualSlotForm.specificationId}
                                    onChange={e => setManualSlotForm({...manualSlotForm, specificationId: e.target.value})}
                                 >
                                    <option value="">Cualquiera disponible</option>
                                    {services.find(s => s.id === serviceId)?.specifications?.map((sp: any) => (
                                       <option key={sp.id} value={sp.id}>{sp.name}</option>
                                    ))}
                                 </select>
                              </div>
                           ) : null}

                           <button 
                              type="submit"
                              disabled={addingManual}
                              className="h-11 px-6 rounded-xl bg-primary-600 text-white font-black hover:bg-primary-700 transition-all disabled:opacity-50"
                           >
                              {addingManual ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirmar Slot'}
                           </button>
                        </form>
                     </div>
                  )}

                 {loading ? (
                    <div className="flex py-20 justify-center">
                       <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
                    </div>
                 ) : slots.length === 0 ? (
                    <div className="text-center py-24">
                       <div className="bg-gray-50 h-24 w-24 rounded-full flex items-center justify-center mx-auto mb-6">
                          <Trash2 className="h-10 w-10 text-gray-200" />
                       </div>
                       <h3 className="text-xl font-black text-gray-900">No hay cupos generados</h3>
                       <p className="text-gray-500 font-medium mt-1">Genera cupos usando las reglas de la izquierda o manualmente.</p>
                       <p className="text-xs text-gray-300 mt-4 italic">Nota: Las reservas dinámicas se crearán automáticamente según las reglas.</p>
                    </div>
                 ) : (
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                       {slots.map(sl => (
                          <div 
                             key={sl.id} 
                             className={`relative rounded-3xl border-2 p-5 transition-all ${
                                sl.isBooked 
                                   ? 'bg-amber-50/50 border-amber-100/50' 
                                   : 'bg-white border-gray-50 hover:border-primary-200 shadow-sm'
                             }`}
                          >
                             <p className="text-lg font-black text-gray-900 tracking-tight">
                                {format(new Date(sl.startTime), 'HH:mm')}
                             </p>
                             <p className="text-[10px] font-black text-gray-400 uppercase mt-1 tracking-wider">
                                {sl.isBooked ? 'Reserva Confirmada' : 'Cupo Disponible'}
                             </p>

                             {sl.specificationId ? (
                                <div className="mt-2 text-[10px] font-bold text-primary-500 bg-primary-50 w-fit px-2 py-0.5 rounded-md">
                                   {services.find(s => s.id === serviceId)?.specifications?.find(sp => sp.id === sl.specificationId)?.name || 'Especialista'}
                                </div>
                             ) : (
                                <div className="mt-2 text-[10px] font-bold text-gray-400 bg-gray-50 w-fit px-2 py-0.5 rounded-md italic">
                                   Dinámico / General
                                </div>
                             )}
                             
                             {!sl.isBooked && (
                                <button 
                                   onClick={() => removeSlot(sl.id)}
                                   className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                >
                                   <X className="h-4 w-4" />
                                </button>
                             )}
                          </div>
                       ))}
                    </div>
                 )}
              </div>
           </section>
        </div>
      </main>
    </div>
  );
}
