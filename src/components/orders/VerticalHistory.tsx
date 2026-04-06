'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  History, 
  Calendar, 
  Ticket, 
  LayoutGrid, 
  Loader2, 
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function VerticalHistory() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch('/api/client/my-history');
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (e) {
        console.error('Error loading history:', e);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  if (loading) return null;
  if (!data) return null;

  const hasAny = data.services.length > 0 || data.tables.length > 0 || data.tickets.length > 0;
  if (!hasAny) return null;

  return (
    <div className="space-y-8 mt-12 pb-10">
      <div className="flex items-center gap-2 border-b-2 border-gray-100 pb-3">
         <History className="h-6 w-6 text-primary-600" />
         <h2 className="text-2xl font-bold text-gray-900">Mis Reservas y Entradas</h2>
      </div>

      {/* Tickets Section */}
      {data.tickets.length > 0 && (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800">
             <Ticket className="h-5 w-5 text-amber-500" />
             Mis Entradas
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.tickets.map((t: any) => (
              <div 
                key={t.id} 
                onClick={() => router.push(`/orders?ticket=${t.id}`)}
                className="group flex cursor-pointer items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                     <Ticket size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{t.event.name}</p>
                    <p className="text-xs text-gray-500">
                      {t.event.restaurant.name} · {format(new Date(t.event.date), 'dd MMM yyyy', { locale: es })}
                    </p>
                    <div className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      t.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {t.status === 'PAID' ? 'Confirmada' : t.status}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300 transition group-hover:translate-x-1 group-hover:text-primary-600" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Services Section */}
      {data.services.length > 0 && (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800">
             <Calendar className="h-5 w-5 text-primary-600" />
             Mis Citas de Servicio
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.services.map((s: any) => (
              <div 
                key={s.id} 
                onClick={() => router.push(`/orders?serviceReservation=${s.id}`)}
                className="group flex cursor-pointer items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                     <Calendar size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{s.slot.serviceOffering.name}</p>
                    <p className="text-xs text-gray-500">
                      {s.slot.serviceOffering.restaurant.name} · {format(new Date(s.slot.startTime), 'dd MMM HH:mm', { locale: es })}
                    </p>
                    <div className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      s.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {s.status === 'CONFIRMED' ? 'Confirmado' : s.status}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300 transition group-hover:translate-x-1 group-hover:text-primary-600" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tables Section */}
      {data.tables.length > 0 && (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800">
             <LayoutGrid className="h-5 w-5 text-indigo-600" />
             Mis Reservas de Mesa
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.tables.map((t: any) => (
              <div 
                key={t.id} 
                onClick={() => router.push(`/orders?tableReservation=${t.id}`)}
                className="group flex cursor-pointer items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                     <LayoutGrid size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Mesa {t.table.name}</p>
                    <p className="text-xs text-gray-500">
                      {t.table.restaurant.name} · {t.event ? t.event.name : 'Reserva estándar'}
                    </p>
                    <div className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      t.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {t.status === 'CONFIRMED' ? 'Confirmada' : t.status}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300 transition group-hover:translate-x-1 group-hover:text-primary-600" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
