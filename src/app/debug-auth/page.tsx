/**
 * Debug page to check authentication status
 */

'use client';

import { useAuth } from '../../providers/AuthProvider';
import { useEffect, useState } from 'react';
import { Header } from '../../components/layout/Header';

interface ApiUserData {
  id?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  placeId?: string | null;
  restaurantId?: string | null;
  error?: string;
}

export default function DebugAuthPage() {
  const { user, userRole, loading } = useAuth();
  const [apiData, setApiData] = useState<ApiUserData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) {
      fetch(`/api/auth/user?email=${encodeURIComponent(user.email)}`)
        .then(async (res) => {
          const data = await res.json();
          setApiData(data);
          if (!res.ok) {
            setError(`API Error: ${res.status} - ${JSON.stringify(data)}`);
          }
        })
        .catch((err) => {
          setError(`Fetch Error: ${err.message}`);
        });
    }
  }, [user]);

  return (
    <>
      <Header title="Debug Auth" />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold">Estado de Autenticación</h1>

        <div className="space-y-6">
          {/* Auth Provider State */}
          <div className="card">
            <h2 className="mb-4 text-xl font-bold">Estado del AuthProvider</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-semibold">Loading:</span>
                <span>{loading ? 'Si' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Usuario (Supabase):</span>
                <span>{user ? user.email : 'No hay usuario'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Rol (AuthProvider):</span>
                <span className={userRole ? 'text-green-600' : 'text-red-600'}>
                  {userRole || 'No hay rol'}
                </span>
              </div>
            </div>
          </div>

          {/* API Response */}
          <div className="card">
            <h2 className="mb-4 text-xl font-bold">Respuesta del API</h2>
            {error ? (
              <div className="rounded-lg bg-red-50 p-4 text-red-800">
                <p className="font-semibold">Error:</p>
                <p>{error}</p>
              </div>
            ) : apiData ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-semibold">ID:</span>
                  <span>{apiData.id || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Email:</span>
                  <span>{apiData.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Rol:</span>
                  <span
                    className={
                      apiData.role ? 'font-bold text-green-600' : 'text-red-600'
                    }
                  >
                    {apiData.role || 'No hay rol'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Activo:</span>
                  <span>{apiData.isActive ? 'Si' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Place ID:</span>
                  <span>{apiData.placeId || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Restaurant ID:</span>
                  <span>{apiData.restaurantId || 'N/A'}</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Cargando datos del API...</p>
            )}
          </div>

          {/* Raw Data */}
          <div className="card">
            <h2 className="mb-4 text-xl font-bold">Datos Raw</h2>
            <pre className="overflow-auto rounded-lg bg-gray-100 p-4 text-xs">
              {JSON.stringify({ user, userRole, loading, apiData }, null, 2)}
            </pre>
          </div>

          {/* Actions */}
          <div className="card">
            <h2 className="mb-4 text-xl font-bold">Acciones</h2>
            <div className="space-y-2">
              <button
                onClick={() => window.location.reload()}
                className="btn-primary w-full"
              >
                Recargar Página
              </button>
              <button
                onClick={() => {
                  if (user?.email) {
                    fetch(
                      `/api/auth/user?email=${encodeURIComponent(user.email)}`
                    )
                      .then((res) => res.json())
                      .then((data) => {
                        alert(`Rol actual: ${data.role || 'No encontrado'}`);
                        window.location.reload();
                      });
                  }
                }}
                className="btn-secondary w-full"
              >
                Verificar Rol en API
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
