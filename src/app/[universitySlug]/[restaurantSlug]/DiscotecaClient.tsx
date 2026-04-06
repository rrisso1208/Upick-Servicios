'use client';

import { useState, useEffect } from 'react';
import { 
  PartyPopper, 
  LayoutGrid, 
  Utensils, 
  Calendar, 
  Ticket, 
  Users, 
  Loader2, 
  ArrowRight,
  ShoppingBag,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { PickuMascot } from '@/components/ui/PickuMascot';
import { ProductCard } from '@/components/ui/ProductCard';
import { supabase } from '@/providers/AuthProvider';
import { Check, ArrowLeft, CreditCard } from 'lucide-react';


interface Event {
  id: string;
  name: string;
  description: string | null;
  date: string;
  coverPrice: number | null;
  bannerUrl: string | null;
  maxCapacity: number | null;
}

interface Table {
  id: string;
  name: string;
  capacity: number;
  price: number | null;
  description: string | null;
}

interface DiscotecaClientProps {
  restaurant: any; 
  onProductSelect: (product: any) => void;
}

export function DiscotecaClient({ restaurant, onProductSelect }: DiscotecaClientProps) {

  const [activeTab, setActiveTab] = useState<'events' | 'tables' | 'menu'>('events');
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  
  const [buying, setBuying] = useState(false);
  const [ticketQty, setTicketQty] = useState(1);

  // Checkout Summary State
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutData, setCheckoutData] = useState<{
    type: 'ticket' | 'table';
    itemId: string;
    name: string;
    price: number;
    event: Event;
    table?: Table;
  } | null>(null);

  // Load events
  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch(`/api/client/restaurants/${restaurant.id}/events`);
        const json = await res.json();
        if (json.success) {
          setEvents(json.data.events);
        }
      } catch (e) {
        console.error('Error loading events:', e);
      } finally {
        setLoadingEvents(false);
      }
    }
    loadEvents();
  }, [restaurant.id]);

  // Load tables when event changes
  useEffect(() => {
    if (activeTab === 'tables' && selectedEvent) {
      async function loadTables() {
        setLoadingTables(true);
        try {
          const res = await fetch(`/api/client/events/${selectedEvent?.id}/tables`);
          const json = await res.json();
          if (json.success) {
            setTables(json.data.tables);
          }
        } catch (e) {
          console.error('Error loading tables:', e);
        } finally {
          setLoadingTables(false);
        }
      }
      loadTables();
    }
  }, [selectedEvent, activeTab]);

  function handleOpenTicketCheckout(event: Event) {
    if (!event.coverPrice) return;
    setCheckoutData({
      type: 'ticket',
      itemId: event.id,
      name: `Boleta - ${event.name}`,
      price: event.coverPrice,
      event: event
    });
    setTicketQty(1);
    setShowCheckout(true);
  }

  function handleOpenTableCheckout(table: Table) {
    if (!selectedEvent || table.price === null) return;
    setCheckoutData({
      type: 'table',
      itemId: table.id,
      name: `Mesa ${table.name}`,
      price: table.price,
      event: selectedEvent,
      table: table
    });
    setShowCheckout(true);
  }

  async function handleFinalPurchase() {
    if (!checkoutData) return;
    
    setBuying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Debes iniciar sesión para realizar la compra');
        return;
      }

      const endpoint = checkoutData.type === 'ticket' 
        ? '/api/client/tickets/purchase' 
        : '/api/client/table-reservations';
      
      const payload = checkoutData.type === 'ticket'
        ? { eventId: checkoutData.itemId, quantity: ticketQty }
        : { tableId: checkoutData.itemId, eventId: checkoutData.event.id };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success && json.data.paymentUrl) {
        window.location.href = json.data.paymentUrl;
      } else {
        alert(json.error || 'Error al procesar la compra');
      }
    } catch (e) {
      console.error('Purchase error:', e);
      alert('Error al conectar con la pasarela de pagos');
    } finally {
      setBuying(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 pb-32">
       {/* Header */}
       <div className="mb-8 text-center">
          <h1 className="text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">{restaurant.name}</h1>
          <p className="mt-2 text-gray-600">{restaurant.description || 'La mejor rumba está aquí'}</p>
       </div>

       {/* Tabs */}
       <div className="mb-8 flex justify-center">
          <div className="inline-flex rounded-2xl bg-gray-100 p-1.5 shadow-inner">
             <button
                onClick={() => setActiveTab('events')}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
                  activeTab === 'events' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
             >
                <PartyPopper className="h-4 w-4" />
                Eventos
             </button>
             <button
                onClick={() => setActiveTab('tables')}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
                  activeTab === 'tables' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
             >
                <LayoutGrid className="h-4 w-4" />
                Mesas
             </button>
             <button
                onClick={() => setActiveTab('menu')}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
                  activeTab === 'menu' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
             >
                <Utensils className="h-4 w-4" />
                Menú
             </button>
          </div>
       </div>

       {activeTab === 'events' && (
          <div className="grid gap-6 sm:grid-cols-2">
             {loadingEvents ? (
                <div className="col-span-full flex py-20 justify-center">
                   <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                </div>
             ) : events.length === 0 ? (
                <div className="col-span-full rounded-3xl border-2 border-dashed border-gray-100 py-16 text-center">
                   <PickuMascot variant="querico" size="lg" className="mx-auto mb-4 opacity-30 grayscale" />
                   <p className="text-lg font-medium text-gray-400">No hay eventos próximos.</p>
                </div>
             ) : (
                events.map((event) => (
                   <div key={event.id} className="group overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-xl">
                      <div className="relative aspect-[16/9] bg-gray-100">
                         {event.bannerUrl ? (
                            <img src={event.bannerUrl} alt={event.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                         ) : (
                            <div className="flex h-full w-full items-center justify-center text-primary-200">
                               <PartyPopper size={64} />
                            </div>
                         )}
                         <div className="absolute left-4 top-4 rounded-xl bg-white/90 px-3 py-1.5 text-center shadow-lg backdrop-blur-sm">
                            <p className="text-xs font-bold uppercase text-primary-600">{format(new Date(event.date), 'MMM', { locale: es })}</p>
                            <p className="text-lg font-black text-gray-900 leading-tight">{format(new Date(event.date), 'dd')}</p>
                         </div>
                      </div>
                      <div className="p-6">
                         <h3 className="text-xl font-bold text-gray-900">{event.name}</h3>
                         <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="h-4 w-4 text-primary-600" />
                            <span>{format(new Date(event.date), "EEEE d 'de' MMMM", { locale: es })}</span>
                         </div>
                         {event.coverPrice != null && (
                            <div className="mt-6 flex items-center justify-between border-t pt-4">
                               <div>
                                  <p className="text-xs text-gray-500">Cover desde</p>
                                  <p className="text-xl font-black text-primary-600">{formatCurrency(event.coverPrice)}</p>
                               </div>
                               <button 
                                  onClick={() => handleOpenTicketCheckout(event)}
                                  disabled={buying}
                                  className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-black active:scale-95 disabled:opacity-50"
                               >
                                  Comprar Boleta
                                  <ArrowRight className="h-4 w-4" />
                               </button>
                            </div>
                         )}
                      </div>
                   </div>
                ))
             )}
          </div>
       )}

       {activeTab === 'tables' && (
          <div>
             <div className="mb-6 rounded-2xl bg-amber-50 p-4 border border-amber-100 text-amber-900 text-sm flex gap-3">
                <Info className="h-5 w-5 shrink-0" />
                <p>Para reservar una mesa, selecciona primero el evento al que asistirás.</p>
             </div>

             <div className="mb-8 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {events.map((ev) => (
                   <button
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className={`flex min-w-[140px] flex-col rounded-2xl border p-4 text-left transition-all ${
                        selectedEvent?.id === ev.id 
                          ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-600' 
                          : 'border-gray-200 bg-white hover:border-primary-200'
                      }`}
                   >
                      <p className="text-xs font-bold text-primary-600 uppercase mb-1">{format(new Date(ev.date), 'dd MMM', { locale: es })}</p>
                      <p className="text-sm font-bold text-gray-900 line-clamp-1">{ev.name}</p>
                   </button>
                )) }
             </div>

             {selectedEvent ? (
                loadingTables ? (
                   <div className="flex py-20 justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                   </div>
                ) : (
                   <div className="grid gap-4 sm:grid-cols-3">
                      {tables.map((t) => (
                         <div key={t.id} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                            <div className="mb-4 flex items-start justify-between">
                               <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400">
                                  <LayoutGrid className="h-6 w-6" />
                               </div>
                               <div className="flex items-center gap-1 text-sm font-bold text-gray-500">
                                  <Users className="h-4 w-4" />
                                  {t.capacity}
                               </div>
                            </div>
                            <h4 className="font-bold text-gray-900">{t.name}</h4>
                            {t.description && <p className="mt-1 text-xs text-gray-500">{t.description}</p>}
                            <div className="mt-6">
                               <p className="mb-2 text-xs text-gray-400">Reserva</p>
                               <button 
                                  onClick={() => handleOpenTableCheckout(t)}
                                  disabled={buying}
                                  className="w-full rounded-xl bg-primary-600 py-3 text-sm font-bold text-white shadow-lg shadow-primary-100 transition-all hover:bg-primary-700 active:scale-95 disabled:opacity-50"
                               >
                                  {t.price != null ? formatCurrency(t.price) : 'Gratis'}
                                </button>
                            </div>
                         </div>
                      ))}
                      {tables.length === 0 && (
                         <div className="col-span-full py-10 text-center text-gray-500">
                            No hay mesas disponibles para este evento.
                         </div>
                      )}
                   </div>
                )
             ) : (
                <div className="flex flex-col items-center py-20 opacity-40">
                   <LayoutGrid size={64} className="mb-4" />
                   <p className="text-gray-500">Selecciona un evento para ver las mesas</p>
                </div>
             )}
          </div>
       )}

        {activeTab === 'menu' && (
          <div className="space-y-8 pb-10">
             <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="text-center">
                   <PickuMascot variant="querico" size="md" className="mx-auto mb-2" />
                   <h2 className="text-2xl font-black text-gray-900">Menú {restaurant.name}</h2>
                   <p className="text-gray-500">Pide desde tu mesa y retira en barra</p>
                </div>
             </div>

             {restaurant.categories.map((category: any) => (
               <div key={category.id} className="scroll-mt-32">
                 <div className="mb-4 border-b pb-3">
                   <h3 className="text-xl font-bold text-gray-900">{category.name}</h3>
                   {category.description && <p className="text-sm text-gray-500 mt-1">{category.description}</p>}
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                   {category.products.map((product: any) => (
                     <ProductCard
                       key={product.id}
                       product={product}
                       onClick={() => onProductSelect(product)}
                     />
                   ))}
                 </div>
                 
                 {category.products.length === 0 && (
                   <p className="py-4 text-center text-gray-400 italic">No hay productos en esta categoría</p>
                 )}
               </div>
             ))}

             {restaurant.categories.length === 0 && (
               <div className="py-20 text-center opacity-40">
                  <Utensils size={64} className="mx-auto mb-4" />
                  <p className="text-gray-500">Aún no se han configurado productos en el menú.</p>
               </div>
             )}
          </div>
       )}

        {/* Modal de Resumen de Compra */}
        {showCheckout && checkoutData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !buying && setShowCheckout(false)} />
             <div className="relative w-full max-w-md overflow-hidden rounded-[40px] bg-white p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
                <button 
                  onClick={() => setShowCheckout(false)}
                  disabled={buying}
                  className="absolute right-6 top-6 rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                <div className="mb-6 flex flex-col items-center text-center">
                   <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                      {checkoutData.type === 'ticket' ? <Ticket className="h-8 w-8" /> : <LayoutGrid className="h-8 w-8" />}
                   </div>
                   <h2 className="text-2xl font-black text-gray-900">Resumen de Compra</h2>
                   <p className="text-gray-500">Confirma los detalles de tu orden</p>
                </div>

                <div className="space-y-4 rounded-3xl bg-gray-50 p-6">
                   <div className="flex justify-between items-start">
                      <div>
                         <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Ítem</p>
                         <p className="font-bold text-gray-900">{checkoutData.name}</p>
                      </div>
                      {checkoutData.type === 'ticket' && (
                        <div className="flex items-center gap-3">
                           <button 
                             onClick={() => setTicketQty(Math.max(1, ticketQty - 1))}
                             className="h-8 w-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-600"
                           >
                             -
                           </button>
                           <span className="font-bold text-gray-900">{ticketQty}</span>
                           <button 
                             onClick={() => setTicketQty(ticketQty + 1)}
                             className="h-8 w-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-600"
                           >
                             +
                           </button>
                        </div>
                      )}
                   </div>

                   <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Evento</p>
                      <p className="font-medium text-gray-700">{checkoutData.event.name}</p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(checkoutData.event.date), "EEEE d 'de' MMMM", { locale: es })}
                      </p>
                   </div>

                   <div className="border-t pt-4">
                      <div className="flex items-center justify-between">
                         <p className="text-lg font-bold text-gray-900">Total a pagar</p>
                         <p className="text-2xl font-black text-primary-600">
                           {formatCurrency(checkoutData.price * (checkoutData.type === 'ticket' ? ticketQty : 1))}
                         </p>
                      </div>
                   </div>
                </div>

                <div className="mt-8 space-y-3">
                   <button
                      onClick={handleFinalPurchase}
                      disabled={buying}
                      className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gray-900 py-4 text-lg font-bold text-white shadow-xl transition-all hover:bg-black active:scale-95 disabled:opacity-50"
                   >
                      {buying ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-5 w-5" />
                          Pagar con Wompi
                        </>
                      )}
                   </button>
                   <p className="text-center text-[10px] text-gray-400">
                      Al proceder, serás redirigido a la pasarela de pagos segura de Wompi.
                   </p>
                </div>
             </div>
          </div>
        )}
    </div>
  );
}
