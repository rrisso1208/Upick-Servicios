/**
 * Cookie Banner - Banner informativo sobre el uso de cookies
 * Opción B: Banner informativo simple (no requiere consentimiento para cookies técnicas)
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Cookie } from 'lucide-react';

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Verificar si el usuario ya cerró el banner
    const cookieBannerDismissed = localStorage.getItem(
      'cookie-banner-dismissed'
    );
    if (!cookieBannerDismissed) {
      // Mostrar el banner después de un pequeño delay para mejor UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    // Guardar preferencia en localStorage
    localStorage.setItem('cookie-banner-dismissed', 'true');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-16 left-0 right-0 z-50 animate-slide-up md:bottom-0">
      <div className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
        <div className="card flex items-start gap-3 border-2 border-primary-200 bg-white p-4 shadow-xl sm:gap-4 sm:p-5 md:items-center">
          <div className="flex-shrink-0 rounded-full bg-primary-100 p-2">
            <Cookie className="h-5 w-5 text-primary-600" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="mb-1 text-sm font-semibold text-gray-900">
              Uso de Cookies
            </h3>
            <p className="text-xs leading-relaxed text-gray-600">
              Utilizamos cookies técnicas necesarias para mantener tu sesión y
              garantizar el funcionamiento de la plataforma. Al continuar
              navegando, aceptas nuestro uso de cookies.{' '}
              <Link
                href="/politica-privacidad"
                className="font-medium text-primary-600 underline hover:text-primary-700"
              >
                Más información
              </Link>
            </p>
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            aria-label="Cerrar banner de cookies"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
