/**
 * Test page to debug authentication
 */

'use client';

import { useAuth } from '../../providers/AuthProvider';
import { useEffect, useState } from 'react';
import { Header } from '../../components/layout/Header';

export default function TestAuthPage() {
  const { user, userRole, loading } = useAuth();
  const [dbUser, setDbUser] = useState<any>(null);

  useEffect(() => {
    if (user?.email) {
      fetch(`/api/auth/user?email=${encodeURIComponent(user.email)}`)
        .then(res => res.json())
        .then(data => setDbUser(data))
        .catch(err => console.error(err));
    }
  }, [user]);

  return (
    <>
      <Header title="Test Auth" />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Estado de Autenticación</h1>

        <div className="space-y-6">
          {/* Supabase User */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-3">Supabase Auth User:</h2>
            {loading ? (
              <p>Cargando...</p>
            ) : user ? (
              <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                {JSON.stringify({
                  id: user.id,
                  email: user.email,
                  confirmed: user.email_confirmed_at,
                }, null, 2)}
              </pre>
            ) : (
              <p className="text-red-600">No hay usuario logueado en Supabase</p>
            )}
          </div>

          {/* Context Role */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-3">Rol desde Context:</h2>
            <p className="text-lg">
              <strong>{userRole || 'Sin rol'}</strong>
            </p>
          </div>

          {/* Database User */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-3">Usuario en Base de Datos:</h2>
            {dbUser ? (
              <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                {JSON.stringify(dbUser, null, 2)}
              </pre>
            ) : (
              <p className="text-red-600">No se encontró en la base de datos</p>
            )}
          </div>

          {/* Access Test */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-3">Test de Acceso:</h2>
            <div className="space-y-2">
              <a href="/" className="btn-secondary block text-center">
                Home (público)
              </a>
              <a href="/orders" className="btn-secondary block text-center">
                Mis Pedidos (estudiante)
              </a>
              <a href="/admin/orders" className="btn-secondary block text-center">
                Admin Orders (restaurant_admin)
              </a>
              <a href="/superadmin/dashboard" className="btn-primary block text-center">
                Superadmin Dashboard (superadmin)
              </a>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}


