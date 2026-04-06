'use client';

import { useMemo, useState } from 'react';
import { Clock } from 'lucide-react';

interface AvailableSlot {
  slotStart: Date;
  slotEnd: Date;
  available: number;
  capacity: number;
}

type PickupMode = 'ASAP' | 'SCHEDULED';

interface SlotPickerProps {
  slots: AvailableSlot[];
  selectedSlot?: Date;
  pickupMode: PickupMode;
  onSelect: (slotStart: Date) => void;
  onSelectAsap: () => void;
  disabled?: boolean;
}

export function SlotPicker({
  slots,
  selectedSlot,
  pickupMode,
  onSelect,
  onSelectAsap,
  disabled,
}: SlotPickerProps) {

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Agrupar por fecha
  const slotsByDate = useMemo(() => {
    return slots.reduce((acc, slot) => {
      const colombiaDateStr = slot.slotStart.toLocaleDateString('en-US', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });

      const [month, day, year] = colombiaDateStr.split('/');
      const dateKey = `${year}-${month}-${day}`;

      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(slot);
      return acc;
    }, {} as Record<string, AvailableSlot[]>);
  }, [slots]);

  const dates = useMemo(() => Object.keys(slotsByDate).sort(), [slotsByDate]);
  const currentDate = selectedDate || dates[0];
  const currentSlots = currentDate ? slotsByDate[currentDate] : [];

  const firstAvailableSlot = useMemo(() => {
    return slots.find((s) => s.available > 0) || null;
  }, [slots]);

  return (
    <div className="space-y-4 max-w-full">

      {/* 🔥 ASAP BUTTON */}
      {!firstAvailableSlot && (
        <button
          type="button"
          onClick={onSelectAsap}
          disabled={disabled}
          className={`w-full rounded-xl border px-4 py-3 transition-all ${pickupMode === 'ASAP'
              ? 'border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-600'
              : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:bg-primary-50'
            }`}
        >
          <div className="flex flex-col items-center">
            <span className="font-semibold">⚡ Lo más pronto posible</span>
          </div>
        </button>
      )}

      {/* DATE TABS */}
      <div className="max-w-full overflow-x-auto pb-2">
        <div className="flex gap-2 w-max snap-x snap-mandatory">
          {dates.map((dateKey) => {
            const [year, month, day] = dateKey.split('-').map(Number);

            // Creamos fecha en Colombia (mediodía para evitar bugs de timezone)
            const dateInColombia = new Date(
              Date.UTC(year, month - 1, day, 12, 0, 0, 0)
            );

            const isSelected = dateKey === currentDate;

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => setSelectedDate(dateKey)}
                disabled={disabled}
                className={`snap-start shrink-0 rounded-2xl border transition-all px-4 py-3 min-w-[80px] ${isSelected
                    ? 'border-red-600 bg-red-600 text-white shadow-md'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <div className="flex flex-col items-center leading-none">
                  {/* Día corto */}
                  <span className={`text-xs font-medium ${isSelected ? 'text-white/90' : 'text-gray-500'
                    }`}>
                    {dateInColombia.toLocaleDateString('es-CO', {
                      timeZone: 'America/Bogota',
                      weekday: 'short',
                    })}
                  </span>

                  {/* Número grande */}
                  <span className="text-lg font-bold">
                    {dateInColombia.toLocaleDateString('es-CO', {
                      timeZone: 'America/Bogota',
                      day: 'numeric',
                    })}
                  </span>

                  {/* Mes corto */}
                  <span className={`text-xs ${isSelected ? 'text-white/90' : 'text-gray-500'
                    }`}>
                    {dateInColombia.toLocaleDateString('es-CO', {
                      timeZone: 'America/Bogota',
                      month: 'short',
                    })}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* TIME SLOTS */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 max-w-full">
        {currentSlots.map((slot) => {
          const slotStartTime = slot.slotStart.getTime();

          const isSelected =
            pickupMode === 'SCHEDULED' &&
            selectedSlot &&
            selectedSlot.getTime() === slotStartTime;

          const isLowCapacity =
            slot.available > 0 && slot.available <= 5;

          const startLabel = slot.slotStart.toLocaleTimeString('es-CO', {
            timeZone: 'America/Bogota',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });

          const endLabel = slot.slotEnd.toLocaleTimeString('es-CO', {
            timeZone: 'America/Bogota',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });

          return (
            <button
              key={slotStartTime}
              type="button"
              onClick={() => onSelect(slot.slotStart)}
              disabled={disabled || slot.available === 0}
              className={`min-w-0 flex flex-col items-center rounded-xl border px-3 py-2.5 transition-all ${
                isSelected
                  ? 'border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-600'
                  : slot.available === 0
                    ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:bg-primary-50'
              }`}
            >
              <Clock className="mb-1 h-4 w-4 shrink-0" />

              <div className="text-sm font-semibold text-center">
                <div>{startLabel}</div>
                <div className="text-xs text-gray-500">- {endLabel}</div>
              </div>

              {/* 🔥 CUPOS DISPONIBLES */}
              <span className="mt-1 text-xs leading-none text-center">
          {slot.available === 0 ? (
            <span className="text-gray-400">Lleno</span>
          ) : isLowCapacity ? (
            <span className="text-orange-600">
              {slot.available} disponibles
            </span>
          ) : (
            <span className="text-gray-500">
              {slot.available} disponibles
            </span>
          )}
        </span>
            </button>
          );
        })}
      </div>

      {currentSlots.length === 0 && (
        <div className="rounded-lg bg-gray-50 py-8 text-center text-sm text-gray-600">
          No hay franjas disponibles para esta fecha
        </div>
      )}
    </div>
  );
}