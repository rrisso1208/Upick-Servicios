/**
 * Login page - Email and Password
 *
 * Página de inicio de sesión usando Supabase Auth (email + password).
 * - Lee un query param `redirect` para redireccionar después del login
 * - Inicia sesión con supabase.auth.signInWithPassword
 * - Luego consulta tu backend (/api/auth/user?email=...) para obtener el rol
 * - Redirecciona según: redirect param / pedido pendiente / rol (superadmin, restaurant_admin)
 */

'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { supabase } from '@/providers/AuthProvider';
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';

function LoginContent() {
  // Hook de navegación (ojo: en este código NO se usa router.push, se usa window.location.href)
  const router = useRouter();

  // Para leer query params en App Router (por eso el componente va envuelto en <Suspense>)
  const searchParams = useSearchParams();

  // Si viene ?redirect=/algo, usamos eso; si no, '/'
  const redirect = searchParams.get('redirect') || '/';

  // Estados del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // UI: mostrar/ocultar contraseña
  const [showPassword, setShowPassword] = useState(false);

  // UI: loading para deshabilitar inputs y mostrar spinner
  const [loading, setLoading] = useState(false);

  // Mensaje de error visible en pantalla
  const [error, setError] = useState('');

  /**
   * handleLogin
   * - Previene submit normal del form
   * - Inicia sesión con Supabase
   * - Si la sesión se crea, pide a tu backend el usuario/rol
   * - Decide la ruta final (redirect, recibo de pedido pendiente, panel admin)
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Normaliza el email (evita problemas por mayúsculas/espacios)
      const normalizedEmail = email.toLowerCase().trim();

      /**
       * Login Supabase con email + password
       * Esto crea session en el cliente si las credenciales son correctas.
       */
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email: normalizedEmail,
          password,
        }
      );

      /**
       * Si Supabase devuelve error, se mapea a mensajes más humanos.
       * (Aquí se depende del texto de authError.message)
       */
      if (authError) {
        let errorMessage = 'Credenciales inválidas';

        if (authError.message.includes('Email not confirmed')) {
          errorMessage =
            'Por favor confirma tu email antes de iniciar sesión. Revisa tu bandeja de entrada.';
        } else if (authError.message.includes('Invalid login credentials')) {
          errorMessage =
            'Email o contraseña incorrectos. Verifica tus credenciales.';
        } else if (authError.message.includes('User not found')) {
          errorMessage =
            'No existe una cuenta con este email. Por favor regístrate primero.';
        } else {
          errorMessage = authError.message || 'Credenciales inválidas';
        }

        console.error('Login error:', authError);
        setError(errorMessage);
        return;
      }

      /**
       * Si hay sesión, pasamos a:
       * 1) esperar un momento (para que se asiente la sesión/cookies)
       * 2) consultar nuestro backend por el rol del usuario
       * 3) redireccionar
       */
      if (data.session) {
        // Espera corta para evitar carreras (race conditions) con la sesión
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Fetch user role (tu DB, no Supabase)
        try {
          const userRes = await fetch(
            `/api/auth/user?email=${encodeURIComponent(normalizedEmail)}`
          );

          /**
           * Si tu backend no responde ok:
           * - Caso raro: Supabase auth OK, pero en tu DB no existe el usuario
           *   (por ejemplo: signup falló a medias)
           * - Decisión actual: redirecciona a home/redirect y ya.
           */
          if (!userRes.ok) {
            console.error(
              'Failed to fetch user:',
              userRes.status,
              userRes.statusText
            );
            window.location.href = redirect || '/';
            return;
          }

          const userData = await userRes.json();


          // Validación básica: necesitamos role para decidir ruta
          if (!userData || !userData.role) {
            console.error('User data invalid:', userData);
            window.location.href = redirect || '/';
            return;
          }

          /**
           * Manejo de “pedido pendiente” guardado en localStorage
           * - pendingOrderId: pedido que quedó en proceso / reciente
           * - lastOrderId: último pedido generado
           */
          const pendingOrderId = localStorage.getItem('pendingOrderId');
          const lastOrderId = localStorage.getItem('lastOrderId');

          /**
           * Lógica de redirección:
           * Prioridad:
           * 1) redirect query param (si viene y no es '/')
           * 2) pedido pendiente / último pedido -> recibo
           * 3) según rol -> panel correspondiente
           * 4) si nada aplica -> '/'
           */
          let redirectTo = '/';

          if (redirect && redirect !== '/') {
            redirectTo = redirect;
          } else {
            // ✅ Solo students deben ir a receipt por localStorage
            if (userData.role === 'student') {
              const pendingOrderId = localStorage.getItem('pendingOrderId');
              const lastOrderId = localStorage.getItem('lastOrderId');

              if (pendingOrderId || lastOrderId) {
                const orderId = pendingOrderId || lastOrderId;
                redirectTo = `/orders/${orderId}/receipt`;

                localStorage.removeItem('pendingOrderId');
                localStorage.removeItem('lastOrderId');
              } else {
                redirectTo = '/'; // o donde caiga el student
              }
            } else if (userData.role === 'superadmin') {
              // ✅ Admins nunca deben ir a receipt por localStorage
              localStorage.removeItem('pendingOrderId');
              localStorage.removeItem('lastOrderId');
              redirectTo = '/superadmin/dashboard';
            } else if (userData.role === 'restaurant_admin') {
              localStorage.removeItem('pendingOrderId');
              localStorage.removeItem('lastOrderId');
              redirectTo = '/admin/orders';
            } else {
              redirectTo = '/';
            }
          }

          window.location.href = redirectTo;
        } catch (fetchError) {
          // Si falla el fetch de rol, manda al home/redirect para no bloquear al usuario
          console.error('Failed to fetch user role:', fetchError);
          window.location.href = redirect || '/';
        }
      } else {
        // Caso raro: no hubo session a pesar de no haber authError
        setError('No se pudo crear la sesión. Por favor intenta de nuevo.');
      }
    } catch (err: any) {
      // Error general de conexión/JS
      setError(err.message || 'Error de conexión. Por favor intenta de nuevo.');
    } finally {
      // Siempre apaga loading (éxito o error)
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="Upick" />

      {/* Layout centrado */}
      <main className="flex min-h-screen items-center justify-center px-4 py-12 pb-24">
        <div className="w-full max-w-md">
          <div className="card">
            {/* Encabezado del formulario */}
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
                <Lock className="h-8 w-8 text-primary-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                Iniciar Sesión en Upick
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Ingresa tu email y contraseña
              </p>
            </div>

            {/* Form de login */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* EMAIL */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Correo
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 z-10 -translate-y-1/2 text-primary-600" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="input pl-10"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 z-10 -translate-y-1/2 text-primary-600" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input pl-10 pr-10"
                    disabled={loading}
                    autoComplete="current-password"
                    minLength={6}
                  />

                  {/* Botón para mostrar/ocultar password */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1} // evita que el tab entre al botón (UX)
                  >
                    {!showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Mensaje de error visible */}
              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    Iniciar Sesión
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </button>

              {/* Links de ayuda */}
              <div className="space-y-3">
                <div className="text-center">
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <p className="text-center text-sm text-gray-600">
                  ¿No tienes cuenta?{' '}
                  <Link
                    href="/auth/signup"
                    className="font-medium text-primary-600 hover:text-primary-700"
                  >
                    Regístrate aquí
                  </Link>
                </p>
              </div>
            </form>

            {/* Términos y privacidad */}
            <div className="mt-6 text-center text-xs text-gray-500">
              <p>
                Al continuar, aceptas nuestros{' '}
                <Link
                  href="/terminos-y-condiciones"
                  className="text-primary-600 hover:underline"
                >
                  Términos de Servicio
                </Link>{' '}
                y{' '}
                <Link
                  href="/politica-privacidad"
                  className="text-primary-600 hover:underline"
                >
                  Política de Privacidad
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

/**
 * Wrapper con Suspense:
 * - useSearchParams en Next App Router requiere Suspense
 * - fallback muestra una pantalla de “Cargando...” mientras hidrata params
 */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <>
          <Header title="Upick" />
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-lg text-gray-600">Cargando...</div>
          </div>
        </>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
