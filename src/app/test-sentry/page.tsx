'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect, useState } from 'react';

export default function TestSentryPage() {
  const [errorSent, setErrorSent] = useState(false);

  useEffect(() => {
    // Error de prueba automático al cargar
    try {
      throw new Error('Test Sentry Error - Esto es solo una prueba automática');
    } catch (error) {
      Sentry.captureException(error);
      setErrorSent(true);
      console.log('✅ Error enviado a Sentry');
    }
  }, []);

  const handleManualError = () => {
    try {
      throw new Error('Error manual de prueba desde botón');
    } catch (error) {
      Sentry.captureException(error);
      setErrorSent(true);
      alert('Error enviado a Sentry. Revisa tu dashboard.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-4 text-3xl font-bold text-gray-900">
          🧪 Test de Sentry
        </h1>

        <div className="mb-4 rounded-lg bg-white p-6 shadow">
          <p className="mb-4 text-gray-700">
            Si ves este mensaje, la página se cargó correctamente.
          </p>

          {errorSent && (
            <div className="mb-4 rounded border border-green-200 bg-green-50 p-4">
              <p className="text-green-800">
                ✅ Error enviado a Sentry correctamente
              </p>
            </div>
          )}

          <div className="mb-4 rounded border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              📊 Revisa tu dashboard de Sentry para ver los errores:
            </p>
            <a
              href="https://upick-5u.sentry.io/issues/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-blue-600 underline"
            >
              Ver Dashboard de Sentry →
            </a>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Probar Sentry</h2>

          <button
            onClick={handleManualError}
            className="rounded-lg bg-red-600 px-6 py-3 text-white transition-colors hover:bg-red-700"
          >
            Generar Error de Prueba Manual
          </button>

          <p className="mt-4 text-sm text-gray-600">
            Haz click en el botón para generar un error manual y verificar que
            Sentry lo capture.
          </p>
        </div>

        <div className="mt-6 rounded border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            ⚠️ <strong>Nota:</strong> Después de verificar que Sentry funciona,
            puedes eliminar esta página.
            <br />
            Archivo:{' '}
            <code className="rounded bg-yellow-100 px-2 py-1">
              src/app/test-sentry/page.tsx
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
