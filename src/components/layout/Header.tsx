'use client';
/**
 * ⚠️ DIRECTIVA MUY IMPORTANTE
 *
 * 'use client' indica que este componente:
 * - Se ejecuta en el NAVEGADOR
 * - Puede usar eventos (onClick)
 * - Puede usar hooks (useState, useEffect, etc.)
 *
 * Es obligatorio aquí porque:
 * - Usamos window.history.back()
 * - Hay interacción del usuario
 */

import Link from 'next/link';   // Navegación interna optimizada por Next.js
import Image from 'next/image'; // Imágenes optimizadas (lazy loading, tamaños, etc.)

// Menú de usuario (login / perfil / logout / roles)
import { UserMenu } from '../auth/UserMenu';

/**
 * PROPS DEL HEADER
 *
 * title:
 *  - Texto que se muestra al lado del logo
 *  - Tiene valor por defecto "Upick"
 *
 * showBack:
 *  - Si es true, muestra el botón de "volver atrás"
 */
interface HeaderProps {
  title?: string;
  showBack?: boolean;
}

/**
 * HEADER
 *
 * Este componente:
 * - Se muestra en la parte superior de la app
 * - Es sticky (no se mueve al hacer scroll)
 * - Se renderiza en TODAS las páginas que lo incluyan
 */
export function Header({ title = 'UPick', showBack }: HeaderProps) {
  return (
    /**
     * <header>
     *
     * - sticky top-0 → queda fijo arriba
     * - z-50 → queda por encima de casi todo
     * - backdrop-blur → efecto vidrio (glassmorphism)
     */
    <header className="sticky top-0 z-50 border-b border-gray-200/80 bg-white/80 shadow-lg shadow-gray-900/5 backdrop-blur-xl">

      {/* Contenedor central con ancho máximo y control de desbordamiento */}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">

        {/* LADO IZQUIERDO Y CENTRO: botón back + logo + título (min-w-0 permite que el truncate funcione) */}
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">

          {/*
            BOTÓN "VOLVER"
            - flex-shrink-0 evita que el botón se aplaste
          */}
          {showBack && (
            <button
              onClick={() => window.history.back()}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-600 transition-all duration-200 hover:bg-gray-100/80 hover:text-gray-900 active:scale-95"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}

          {/*
            LOGO + TÍTULO
            - min-w-0 y overflow-hidden son claves para el truncamiento
          */}
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-95"
          >
            <div className="relative h-10 w-10 flex-shrink-0 sm:h-12 sm:w-12">
              <Image
                src="/picku/picku-logo.png"
                alt="Picku"
                fill
                className="object-contain"
                priority
              />
            </div>

            {/* Título con truncamiento para evitar desbordamiento */}
            <span className="text-gradient truncate text-base font-bold sm:text-lg lg:text-xl">
              {title}
            </span>
          </Link>
        </div>

        {/* LADO DERECHO: menú de usuario */}
        <div className="ml-2 flex flex-shrink-0 items-center">
          {/*
            UserMenu:
            - flex-shrink-0 para que el botón de perfil no desaparezca
          */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

