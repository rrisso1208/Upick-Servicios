/**
 * Footer Component with Privacy Policy Link
 *
 * ✅ Qué hace:
 * - Muestra copyright dinámico
 * - Link a la política de privacidad
 * - Mensaje legal (Ley 1581 de 2012 - Colombia)
 *
 * 🔁 Se usa como footer global (ej: en PlacesClient)
 */

'use client';

import Link from 'next/link';        // Navegación interna
import { Shield } from 'lucide-react'; // Ícono de escudo (privacidad)

export function Footer() {
  return (
    /**
     * Footer principal
     *
     * pb-20:
     * - deja espacio abajo en mobile
     * - evita que el BottomNav (si existe) lo tape
     */
    <footer className="border-t border-gray-200 bg-gray-50 pb-20 sm:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Contenido principal del footer */}
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">

          {/* Copyright dinámico */}
          <div className="text-sm text-gray-600">
            © {new Date().getFullYear()} Upick. Todos los derechos reservados.
          </div>

          {/* Links legales */}
          <div className="flex items-center gap-6">
            <Link
              href="/politica-privacidad"
              className="flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-primary-600"
            >
              {/* Ícono de privacidad */}
              <Shield className="h-4 w-4" />
              Política de Privacidad
            </Link>
          </div>
        </div>

        {/* Texto legal adicional */}
        <div className="mt-4 text-center text-xs text-gray-500">
          Protegemos tus datos de acuerdo con la Ley 1581 de 2012 de Colombia
        </div>
      </div>
    </footer>
  );
}

