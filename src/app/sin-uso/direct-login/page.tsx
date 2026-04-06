/**
 * Direct login for superadmin - bypasses redirects
 */

'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function DirectLoginPage() {
  const [email, setEmail] = useState('u.pickcompany@gmail.com');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Iniciando sesión...');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setStatus(`❌ Error: ${error.message}`);
        return;
      }

      if (data.session) {
        setStatus('✅ Sesión iniciada. Esperando...');
        setIsLoggedIn(true);
        
        // Wait for session to propagate
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setStatus('✅ Listo! Usa los botones de abajo');
      }
    } catch (err: any) {
      setStatus(`❌ Error: ${err.message}`);
    }
  };

  const goToDashboard = () => {
    window.location.href = '/superadmin/dashboard';
  };

  const goToUniversities = () => {
    window.location.href = '/superadmin/universities';
  };

  const goToRestaurants = () => {
    window.location.href = '/superadmin/restaurants';
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary-600">Login Directo</h1>
          <p className="mt-2 text-gray-600">Para Superadmin</p>
        </div>

        {!isLoggedIn ? (
          <form onSubmit={handleLogin} className="card space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password:
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                required
              />
            </div>

            <button type="submit" className="btn-primary w-full">
              Iniciar Sesión
            </button>

            {status && (
              <div className="rounded bg-gray-100 p-3 text-sm">
                {status}
              </div>
            )}
          </form>
        ) : (
          <div className="card space-y-4">
            <div className="rounded bg-green-50 p-4 text-center text-green-800">
              ✅ {status}
            </div>

            <div className="space-y-2">
              <button
                onClick={goToDashboard}
                className="btn-primary w-full"
              >
                📊 Ir a Dashboard
              </button>

              <button
                onClick={goToUniversities}
                className="btn-secondary w-full"
              >
                🏛️ Ir a Universidades
              </button>

              <button
                onClick={goToRestaurants}
                className="btn-secondary w-full"
              >
                🍽️ Ir a Restaurantes
              </button>
            </div>

            <div className="text-center text-xs text-gray-500">
              Si algún botón te redirige al login, significa que hay un problema con el middleware.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


