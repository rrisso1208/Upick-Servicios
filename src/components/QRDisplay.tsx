'use client';

import QRCode from 'react-qr-code';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export type QRDisplayVariant = 'restaurant' | 'service' | 'discoteca';

export interface QRDisplayProps {
  variant: QRDisplayVariant;
  /** Contenido codificado en el QR */
  value: string;
  className?: string;
  /** restaurant */
  pickupCode?: string;
  /** service */
  serviceName?: string;
  serviceDate?: Date | string;
  serviceStartTime?: Date | string;
  serviceEndTime?: Date | string;
  /** discoteca */
  eventName?: string;
  eventBannerUrl?: string | null;
  scanned?: boolean;
  scannedAt?: Date | string | null;
}

export function QRDisplay({
  variant,
  value,
  className = '',
  pickupCode,
  serviceName,
  serviceDate,
  serviceStartTime,
  serviceEndTime,
  eventName,
  eventBannerUrl,
  scanned = false,
  scannedAt,
}: QRDisplayProps) {
  if (variant === 'restaurant') {
    return (
      <div className={`card flex flex-col items-center ${className}`}>
        <div className="mb-4 rounded-xl bg-white p-4 shadow-inner">
          <QRCode value={value} size={200} />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">
            Pedido #{pickupCode ?? '—'}
          </p>
          <p className="mt-1 text-sm text-gray-600">Código de recogida</p>
          <p className="text-4xl font-bold tracking-wider text-primary-600">
            {pickupCode}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Escanea este código al retirar tu pedido
          </p>
        </div>
      </div>
    );
  }

  if (variant === 'service') {
    const dateLabel =
      serviceDate != null
        ? format(new Date(serviceDate), "EEEE d 'de' MMMM yyyy", { locale: es })
        : null;
    let timeLabel: string | null = null;
    if (serviceStartTime != null) {
      const start = format(new Date(serviceStartTime), 'HH:mm', { locale: es });
      if (serviceEndTime != null) {
        const end = format(new Date(serviceEndTime), 'HH:mm', { locale: es });
        timeLabel = `${start} – ${end}`;
      } else {
        timeLabel = start;
      }
    }

    return (
      <div className={`card flex flex-col items-center space-y-4 ${className}`}>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">
            Tu reserva confirmada
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Muestra este QR al llegar al negocio para reclamar tu turno
          </p>
        </div>
        {(serviceName || dateLabel || timeLabel) && (
          <div className="w-full rounded-lg border border-primary-100 bg-primary-50/80 px-4 py-3 text-center text-sm text-primary-900">
            {serviceName && (
              <p className="font-semibold">{serviceName}</p>
            )}
            {dateLabel && <p className="mt-1">{dateLabel}</p>}
            {timeLabel && (
              <p className="mt-0.5 font-medium text-primary-800">{timeLabel}</p>
            )}
          </div>
        )}
        <div className="rounded-xl bg-white p-4 shadow-inner">
          <QRCode value={value} size={220} />
        </div>
      </div>
    );
  }

  // discoteca
  return (
    <div className={`card flex flex-col items-center space-y-4 ${className}`}>
      {eventBannerUrl ? (
        <img
          src={eventBannerUrl}
          alt=""
          className="max-h-40 w-full rounded-lg object-cover"
        />
      ) : null}
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          Esta es tu entrada
        </h2>
        {eventName ? (
          <p className="mt-2 text-lg font-medium text-gray-800">{eventName}</p>
        ) : null}
        <p className="mt-3 text-sm font-medium text-amber-900">
          Entrada intransferible — No compartas este QR
        </p>
      </div>
      <div
        className={`relative rounded-xl bg-white p-4 shadow-inner ${
          scanned ? 'pointer-events-none select-none' : ''
        }`}
      >
        <div className={scanned ? 'opacity-50 grayscale' : ''}>
          <QRCode value={value} size={220} />
        </div>
        {scanned && (
          <div className="absolute inset-0 flex items-center justify-center p-2">
            <div className="max-w-[90%] rotate-[-10deg] rounded-lg border-4 border-red-600 bg-white/95 px-4 py-3 text-center shadow-lg">
              <p className="text-lg font-black uppercase tracking-wide text-red-600">
                Ya escaneada
              </p>
              {scannedAt != null && (
                <p className="mt-1 text-xs text-gray-600">
                  {format(new Date(scannedAt), "dd/MM/yyyy HH:mm", {
                    locale: es,
                  })}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
