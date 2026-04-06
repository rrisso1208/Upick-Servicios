/**
 * Forgot Password page - Request password reset
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../../components/layout/Header';
import { supabase } from '../../../providers/AuthProvider';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Normalize email to lowercase
      const normalizedEmail = email.toLowerCase().trim();

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        }
      );

      if (resetError) {
        setError(
          resetError.message || 'Error al enviar el email de recuperación'
        );
        return;
      }

      setSuccess(true);
    } catch (err: any) {
      setError(
        err.message ||
          'Error al procesar la solicitud. Por favor intenta de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="Upick" />
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="card">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
                <Mail className="h-8 w-8 text-primary-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                Recuperar Contraseña
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Ingresa tu correo electrónico y te enviaremos un enlace para
                restablecer tu contraseña
              </p>
            </div>

            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-5 w-5 z-10 -translate-y-1/2 text-primary-600" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@universidad.edu.co"
                      className="input pl-10"
                      disabled={loading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      Enviar enlace de recuperación
                      <Mail className="ml-2 h-4 w-4" />
                    </>
                  )}
                </button>

                <Link
                  href="/auth/login"
                  className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-primary-600"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver al inicio de sesión
                </Link>
              </form>
            ) : (
              <div className="space-y-4 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div className="rounded-lg bg-green-50 p-4">
                  <p className="text-sm font-medium text-green-800">
                    ✓ Email enviado exitosamente
                  </p>
                </div>
                <p className="text-sm text-gray-600">
                  Revisa tu correo electrónico y haz clic en el enlace para
                  restablecer tu contraseña. El enlace expirará en 1 hora.
                </p>
                <p className="text-xs text-gray-500">
                  ¿No recibiste el email? Revisa tu carpeta de spam o intenta
                  nuevamente.
                </p>
                <Link
                  href="/auth/login"
                  className="btn-primary mt-4 inline-block"
                >
                  Volver al inicio de sesión
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
