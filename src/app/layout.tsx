// Tipos que Next.js usa para metadata (SEO, PWA, etc.)
import type { Metadata, Viewport } from 'next';

// Fuente Google optimizada por Next.js (se descarga y optimiza automáticamente)
import { Inter } from 'next/font/google';

// CSS global que aplica a TODA la app
import './globals.css';

// Provider de autenticación propio del proyecto
// Aquí normalmente se maneja sesión, usuario, roles, etc.
import { AuthProvider } from '@/providers/AuthProvider';

// Configuración global de SWR (librería para fetching de datos)
import { SWRConfig } from 'swr';

// Componentes globales de UI / layout
import { CookieBanner } from '@/components/ui/CookieBanner';
import { BottomNavGate } from '@/components/layout/BottomNavGate';

// Componentes administrativos que flotan en la pantalla
import { OrderFloatingWidget } from '@/components/admin/OrderFloatingWidget';
import { QRScannerButton } from '@/components/admin/QRScannerButton';

// Librería para mostrar notificaciones tipo toast
import { Toaster } from 'react-hot-toast';

// Se configura la fuente Inter y se limita al subset latino
// Next.js genera automáticamente una clase CSS con esta fuente
const inter = Inter({ subsets: ['latin'] });

/**
 * METADATA GLOBAL
 * Esto lo usa Next.js para:
 * - <title>
 * - <meta description>
 * - iconos
 * - configuración PWA (iOS / Android)
 */
export const metadata: Metadata = {
  title: 'UPick - Ordena tu comida y evita las filas',
  description: '¡Tu tiempo vale oro!',
  icons: {
    icon: '/picku/picku-logo.png',
    apple: '/picku/picku-logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'UPick',
  },
};

/**
 * VIEWPORT
 * Controla el color de la barra del navegador en móviles
 * (Chrome Android, etc.)
 */
export const viewport: Viewport = {
  themeColor: '#dc2626',
};

/**
 * ROOT LAYOUT
 *
 * Este componente:
 * - ENVUELVE TODA la aplicación
 * - Se renderiza UNA SOLA VEZ
 * - Nunca se desmonta al cambiar de página
 *
 * Todo lo que pongas aquí aparece en TODAS las páginas
 */
export default function RootLayout({
                                     children,
                                   }: {
  // children = la página actual (page.tsx) que se esté renderizando
  children: React.ReactNode;
}) {
  return (
    // Etiqueta <html> real del documento
    <html lang="es">
    {/*
        <body> global
        inter.className aplica la fuente Inter a toda la app
      */}
    <body className={inter.className}>

    {/*
          SWRConfig:
          Configuración GLOBAL para todas las llamadas con SWR
        */}
    <SWRConfig
      value={{
        // No vuelve a pedir datos solo por cambiar de pestaña
        revalidateOnFocus: false,

        // Sí revalida cuando vuelve la conexión a internet
        revalidateOnReconnect: true,

        // Evita llamadas duplicadas en un corto periodo (ms)
        dedupingInterval: 2000,
      }}
    >
      {/*
            AuthProvider:
            - Maneja sesión
            - Usuario actual
            - Roles y permisos
            Todo lo que esté dentro puede acceder a auth
          */}
      <AuthProvider>

        {/*
              children:
              Aquí se renderiza la página actual:
              - page.tsx
              - layouts anidados
              - rutas dinámicas
            */}
        {children}

        {/*
              Navegación inferior (mobile-first)
              Visible en TODAS las páginas
            */}
        <BottomNavGate />

        {/*
              Widget flotante para órdenes
              Probablemente visible solo a ciertos roles
            */}
        <OrderFloatingWidget />

        {/*
              Botón flotante para escanear QR
              Muy típico en apps tipo campus / food court
            */}
        <QRScannerButton />

        {/*
              Banner de cookies (legal / consentimiento)
            */}
        <CookieBanner />

        {/*
              Toaster global:
              Maneja notificaciones (success, error, etc.)
              No pertenece a una página específica
            */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </AuthProvider>
    </SWRConfig>
    </body>
    </html>
  );
}
