'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Sparkles, 
  Clock, 
  Calendar, 
  ArrowRight, 
  Loader2, 
  ChevronLeft,
  CalendarDays,
  ShoppingBag
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/providers/AuthProvider';
import { PickuMascot } from '@/components/ui/PickuMascot';

interface ServiceSpecification {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  isBlocking: boolean;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  durationMin: number;
  price: number;
  specifications: ServiceSpecification[];
}

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

interface ServiceClientProps {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    place: {
      slug: string;
    };
  };
}

export function ServiceClient({ restaurant }: ServiceClientProps) {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedSpecId, setSelectedSpecId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);

  const selectedSpec = useMemo(() => {
    return selectedService?.specifications.find(s => s.id === selectedSpecId) || null;
  }, [selectedService, selectedSpecId]);

  // Fetch services on mount
  useEffect(() => {
    async function loadServices() {
      try {
        const res = await fetch(`/api/client/services/${restaurant.id}`);
        const json = await res.json();
        if (json.success) {
          setServices(json.data.services);
        }
      } catch (e) {
        console.error('Error loading services:', e);
      } finally {
        setLoading(false);
      }
    }
    loadServices();
  }, [restaurant.id]);

  // Fetch slots when service, date or spec changes
  useEffect(() => {
    if (!selectedService) return;

    async function loadSlots() {
      setLoadingSlots(true);
      try {
        const params = new URLSearchParams({ date: selectedDate });
        if (selectedSpecId) params.append('specificationId', selectedSpecId);
        
        const res = await fetch(`/api/client/timeslots/${selectedService?.id}?${params.toString()}`);
        const json = await res.json();
        if (json.success) {
          setSlots(json.data.slots);
        }
      } catch (e) {
        console.error('Error loading slots:', e);
      } finally {
        setLoadingSlots(false);
      }
    }
    loadSlots();
  }, [selectedService, selectedDate, selectedSpecId]);

  // Reset spec when service changes
  useEffect(() => {
    setSelectedSpecId(null);
    setSelectedSlotId(null);
  }, [selectedService]);

  // Reset slot when date or spec changes
  useEffect(() => {
    setSelectedSlotId(null);
  }, [selectedDate, selectedSpecId]);

  // Generate 14 days for the date picker (extended for services)
  const upcomingDays = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return {
        key: format(d, 'yyyy-MM-dd'),
        dayName: format(d, 'EEE', { locale: es }),
        dayNum: format(d, 'd'),
        monthName: format(d, 'MMM', { locale: es }),
      };
    });
  }, []);

  async function handleBooking() {
    if (!selectedSlotId) return;
    setBooking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/client/service-reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ 
          slotId: selectedSlotId,
          specificationId: selectedSpecId // Send the spec ID chosen
        }),
      });

      const json = await res.json();
      if (json.success && json.data.paymentUrl) {
        window.location.href = json.data.paymentUrl;
      } else {
        alert(json.error || 'Error al procesar la reserva');
      }
    } catch (e) {
      console.error('Booking error:', e);
      alert('Error de conexión');
    } finally {
      setBooking(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (selectedService) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 pb-32">
        <button 
          onClick={() => setSelectedService(null)}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary-600"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver a servicios
        </button>

        <div className="mb-8 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl shadow-gray-200/50">
          <div className="relative aspect-video w-full overflow-hidden bg-gray-50">
             {selectedService.imageUrl ? (
               <img src={selectedService.imageUrl} className="h-full w-full object-cover" alt={selectedService.name} />
             ) : (
               <div className="flex h-full w-full items-center justify-center bg-primary-50">
                  <Sparkles className="h-16 w-16 text-primary-200" />
               </div>
             )}
          </div>
          <div className="p-6">
            <h2 className="text-3xl font-black text-gray-900">{selectedService.name}</h2>
            {selectedService.description && (
              <p className="mt-2 text-gray-600">{selectedService.description}</p>
            )}
            <div className="mt-6 flex items-center gap-4 text-sm">
               <div className="flex items-center gap-1.5 rounded-full bg-primary-100 px-4 py-2 font-bold text-primary-700">
                  <Clock className="h-4 w-4" />
                  <span>{selectedService.durationMin} min</span>
               </div>
               <div className="text-2xl font-black text-primary-600">
                  {formatCurrency(selectedService.price)}
               </div>
            </div>
          </div>
        </div>

        {/* Specifications Picker (Professionals) */}
        {selectedService.specifications.length > 0 && (
          <div className="mb-8">
            <h3 className="mb-4 flex items-center gap-2 font-black text-gray-900 text-lg">
              <Sparkles className="h-5 w-5 text-primary-600" />
              ¿Con quién quieres agendar?
            </h3>
            <div className="grid grid-cols-2 gap-4 pb-2">
              {selectedService.specifications.map((spec) => (
                <button
                  key={spec.id}
                  onClick={() => setSelectedSpecId(spec.id === selectedSpecId ? null : spec.id)}
                  className={`relative flex flex-col items-center rounded-3xl border-2 p-5 transition-all text-center ${
                    selectedSpecId === spec.id
                      ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-100 ring-offset-2'
                      : 'border-gray-100 bg-white hover:border-primary-200'
                  }`}
                >
                   <div className="mb-3 h-20 w-20 overflow-hidden rounded-full border-4 border-white shadow-md">
                      {spec.imageUrl ? (
                        <img src={spec.imageUrl} className="h-full w-full object-cover" alt={spec.name} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
                          <Sparkles className="h-8 w-8" />
                        </div>
                      )}
                   </div>
                   <span className="font-bold text-gray-900">{spec.name}</span>
                   {spec.description && <span className="mt-1 text-xs text-gray-600 line-clamp-1">{spec.description}</span>}
                   {selectedSpecId === spec.id && (
                     <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-white animate-in zoom-in">
                        <ArrowRight className="h-3 w-3" />
                     </div>
                   )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Date Picker */}
        <div className="mb-8">
          <h3 className="mb-4 flex items-center gap-2 font-black text-gray-900 text-lg">
            <CalendarDays className="h-5 w-5 text-primary-600" />
            Agenda tu día
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
            {upcomingDays.map((day) => (
              <button
                key={day.key}
                onClick={() => setSelectedDate(day.key)}
                className={`flex min-w-[80px] flex-col items-center rounded-3xl border-2 p-4 transition-all ${
                  selectedDate === day.key
                    ? 'border-primary-600 bg-primary-600 text-white shadow-xl shadow-primary-200'
                    : 'border-gray-100 bg-white text-gray-600 hover:border-primary-200 hover:bg-primary-50/50'
                }`}
              >
                <span className={`text-xs font-bold uppercase ${selectedDate === day.key ? 'text-white/80' : 'text-gray-400'}`}>{day.dayName}</span>
                <span className="text-xl font-black my-1">{day.dayNum}</span>
                <span className={`text-[10px] font-bold uppercase transition-all ${selectedDate === day.key ? 'text-white/80' : 'text-gray-500'}`}>{day.monthName}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Slot Picker */}
        <div className="mb-12">
          <h3 className="mb-4 flex items-center gap-2 font-black text-gray-900 text-lg">
             <Clock className="h-5 w-5 text-primary-600" />
             Franjas disponibles
          </h3>
          {loadingSlots ? (
            <div className="flex py-12 justify-center">
               <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
          ) : slots.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-gray-100 py-16 text-center bg-white/50">
               <PickuMascot variant="chef" size="md" className="mx-auto mb-4 opacity-30" />
               <p className="text-gray-500 font-bold">No hay horarios para este día.</p>
               <p className="text-xs text-gray-400 mt-1">Prueba con otra fecha o profesional.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {slots.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => setSelectedSlotId(slot.id)}
                  className={`group flex flex-col items-center justify-center rounded-2xl border-2 p-5 transition-all ${
                    selectedSlotId === slot.id
                      ? 'border-primary-600 bg-primary-100/50 text-primary-700 ring-2 ring-primary-600 ring-offset-2'
                      : 'border-gray-100 bg-white text-gray-700 hover:border-primary-200'
                  }`}
                >
                  <span className="text-lg font-black tracking-tight">
                    {format(new Date(slot.startTime), 'HH:mm')}
                  </span>
                  <span className="text-[10px] font-bold uppercase text-gray-400 mt-1">
                    hasta {format(new Date(slot.endTime), 'HH:mm')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Floating Action Bar */}
        {selectedSlotId && (
          <div className="fixed bottom-0 left-0 right-0 z-50 p-6 animate-in slide-in-from-bottom duration-300">
            <div className="mx-auto max-w-2xl overflow-hidden rounded-3xl bg-white/80 border border-white/20 p-5 shadow-2xl-up backdrop-blur-xl flex items-center justify-between gap-6">
               <div className="flex items-center gap-4">
                  {selectedSpec?.imageUrl ? (
                    <img src={selectedSpec.imageUrl} className="h-12 w-12 rounded-full border-2 border-primary-100 object-cover" alt="" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                      <Sparkles className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-black uppercase text-primary-600 tracking-wider">Cita confirmada</p>
                    <p className="font-black text-gray-900">{formatCurrency(selectedService.price)}</p>
                  </div>
               </div>
               <button
                  onClick={handleBooking}
                  disabled={booking}
                  className="relative flex flex-1 items-center justify-center gap-3 rounded-2xl bg-primary-600 py-4 text-sm font-black text-white shadow-xl shadow-primary-200 transition-all hover:bg-primary-700 active:scale-[0.95] disabled:opacity-50"
               >
                  {booking ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingBag className="h-5 w-5" />}
                  Continuar al pago
                  <ArrowRight className="h-5 w-5" />
               </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-20">
      <div className="mb-12 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-600 text-white shadow-xl shadow-primary-200">
          <Calendar className="h-10 w-10" />
        </div>
        <h2 className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">Servicios</h2>
        <p className="mt-3 text-lg font-medium text-gray-600">Agenda tu próxima experiencia en segundos</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {services.map((s) => (
          <div
            key={s.id}
            onClick={() => setSelectedService(s)}
            className="group relative flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-xl shadow-gray-200/50 transition-all hover:-translate-y-1 hover:border-primary-200 hover:shadow-2xl"
          >
            <div className="flex-1">
               <div className="mb-6 flex items-start justify-between">
                  <div className="h-16 w-16 overflow-hidden rounded-2xl bg-primary-50">
                     {s.imageUrl ? (
                        <img src={s.imageUrl} className="h-full w-full object-cover transition-transform group-hover:scale-110" alt="" />
                     ) : (
                        <div className="flex h-full w-full items-center justify-center text-primary-600">
                           <Sparkles className="h-8 w-8" />
                        </div>
                     )}
                  </div>
                  <div className="rounded-2xl bg-primary-100 px-3 py-1 text-xs font-black text-primary-700">
                     OFERTA
                  </div>
               </div>
               
               <h3 className="text-2xl font-black tracking-tight text-gray-900">{s.name}</h3>
               {s.description && (
                 <p className="mt-2 line-clamp-2 text-sm text-gray-600 font-medium leading-relaxed">{s.description}</p>
               )}

               <div className="mt-6 flex items-center gap-3">
                  {s.specifications.slice(0, 3).map((sp, i) => (
                    <div key={sp.id} className={`h-8 w-8 rounded-full border-2 border-white bg-gray-100 shadow-sm ${i > 0 ? '-ml-4' : ''}`}>
                       {sp.imageUrl && <img src={sp.imageUrl} className="h-full w-full rounded-full object-cover" alt="" />}
                    </div>
                  ))}
                  {s.specifications.length > 3 && (
                    <span className="text-[10px] font-bold text-gray-400">+{s.specifications.length - 3} profesionales</span>
                  )}
               </div>
            </div>
            
            <div className="mt-10 flex items-center justify-between border-t border-gray-50 pt-6">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-400">
                <Clock className="h-4 w-4" />
                <span>{s.durationMin} MIN</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-primary-600">{formatCurrency(s.price)}</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-900 text-white shadow-lg transition-transform group-hover:bg-primary-600 group-hover:translate-x-1">
                  <ArrowRight className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {services.length === 0 && (
         <div className="mt-32 flex flex-col items-center text-center">
            <div className="bg-gray-50 p-12 rounded-full mb-6">
              <PickuMascot variant="chef" size="lg" className="opacity-20 translate-y-2 grayscale" />
            </div>
            <h3 className="text-2xl font-black text-gray-900">No hay servicios</h3>
            <p className="mt-2 text-gray-500 font-medium">Vuelve pronto para ver nuestras ofertas.</p>
         </div>
      )}
    </div>
  );
}

