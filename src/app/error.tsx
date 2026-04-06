/**
 * Global error boundary
 */

'use client';

import { useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { AlertTriangle } from 'lucide-react';
import logger from '../lib/logger';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service
    logger.error(
      {
        message: error.message,
        stack: error.stack,
        digest: error.digest,
      },
      'Application error'
    );
  }, [error]);

  return (
    <>
      <Header />
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900">Algo salió mal</h1>

          <p className="mt-4 text-gray-600">
            {error.message ||
              'Ocurrió un error inesperado. Por favor intenta de nuevo.'}
          </p>

          {error.digest && (
            <p className="mt-2 text-sm text-gray-500">
              Error ID: {error.digest}
            </p>
          )}

          <div className="mt-8 flex justify-center gap-4">
            <button onClick={reset} className="btn-primary">
              Intentar de nuevo
            </button>

            <button
              onClick={() => (window.location.href = '/')}
              className="btn-secondary"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
