/**
 * Authentication Provider with Supabase
 * Manages user session and provides auth context
 *
 * ✅ Qué hace este archivo:
 * - Crea un "AuthContext" global (React Context)
 * - Mantiene en memoria: user, userRole, loading
 * - Se conecta a Supabase para:
 *   - obtener la sesión inicial
 *   - escuchar cambios (login/logout)
 * - Pregunta al backend (Next API) cuál es el rol del usuario (userRole)
 *
 * ⚠️ Importante:
 * - Supabase maneja autenticación (quién es el usuario)
 * - Tu base de datos (Prisma/Postgres) maneja roles (student, admin, etc.)
 *   Por eso hay un endpoint: /api/auth/user?email=...
 */

'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';

import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

import { useRouter } from 'next/navigation';

/**
 * SUPABASE CLIENT (en el navegador)
 *
 * Usa variables NEXT_PUBLIC_...
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * ⚠️ Ojo:
 * Estas variables son públicas (van al frontend).
 * Eso es normal en Supabase: la seguridad real está en las reglas/policies.
 */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * TIPO del AuthContext
 * Esto define lo que cualquier componente puede pedir con useAuth()
 */
interface AuthContextType {
  user: User | null;                 // usuario autenticado (Supabase)
  userRole: string | null;           // rol en TU sistema (Prisma)
  loading: boolean;                  // si todavía está cargando auth al iniciar
  signOut: () => Promise<void>;      // cerrar sesión
  refreshSession: () => Promise<void>; // volver a pedir sesión + rol
}

/**
 * Context con valores por defecto
 */
const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  loading: true,
  signOut: async () => {},
  refreshSession: async () => {},
});

/**
 * AuthProvider
 *
 * Se monta en el layout global:
 * <AuthProvider>{children}</AuthProvider>
 *
 * Eso significa que:
 * ✅ toda la app tiene acceso a user/userRole
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Estado del usuario (Supabase)
  const [user, setUser] = useState<User | null>(null);

  // Rol del usuario (lo devuelve tu backend / Prisma)
  const [userRole, setUserRole] = useState<string | null>(null);

  // Loading global para no mostrar UI "raras" al inicio
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  /**
   * fetchUserRole(email)
   *
   * ✅ Qué hace:
   * - Llama a: /api/auth/user?email=...
   * - Espera JSON con { role: "student" | "restaurant_admin" | ... }
   * - Guarda el rol en state (setUserRole)
   *
   * ✅ retries:
   * - intenta varias veces si hay fallos temporales
   */
  const fetchUserRole = useCallback(async (email: string, retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(
          `/api/auth/user?email=${encodeURIComponent(email)}`,
          {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' },
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log('User role fetched:', data.role, 'for email:', email);
          setUserRole(data.role);
          return;
        } else if (response.status === 503) {
          if (attempt === 1) {
            console.log('Database connection error, retrying once...');
            await new Promise((resolve) => setTimeout(resolve, 2000));
            continue;
          } else {
            console.warn(
              'Unable to fetch user role due to database connection issues'
            );
            setUserRole(null);
            return;
          }
        }

        const errorData = await response
          .json()
          .catch(() => ({ error: 'Unknown error' }));

        console.error('Failed to fetch user role:', response.status, errorData);

        if (response.status === 404) {
          setUserRole(null);
          return;
        }

        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        setUserRole(null);
      } catch (error) {
        console.error(
          `Error fetching user role (attempt ${attempt}/${retries}):`,
          error
        );

        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        setUserRole(null);
      }
    }
  }, []);

  /**
   * useEffect principal: Inicializar auth + escuchar cambios
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        setUser(session?.user ?? null);

        if (session?.user) {
          await Promise.race([
            fetchUserRole(session.user.email!),
            new Promise((resolve) => setTimeout(resolve, 5000)),
          ]).catch((error) => {
            console.error('Error fetching user role:', error);
          });

          setLoading(false);
        } else {
          setUserRole(null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setLoading(false);
      }
    };

    initAuth();

    /**
     * Listener de cambios de auth
     *
     * ✅ Parche: NO volver a pedir rol en cada TOKEN_REFRESHED
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        // ✅ Evita spamear el backend en refreshes internos del token
        if (event !== 'TOKEN_REFRESHED') {
          await Promise.race([
            fetchUserRole(session.user.email!),
            new Promise((resolve) => setTimeout(resolve, 5000)),
          ]).catch((error) => {
            console.error('Error fetching user role:', error);
          });
        }

        setLoading(false);
      } else {
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserRole]);

  /**
   * signOut:
   * - Cierra sesión en Supabase
   * - Limpia estados locales
   * - Redirige a "/"
   */
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
    router.push('/');
  };

  /**
   * refreshSession:
   * - vuelve a leer la sesión actual
   * - si hay error, limpia todo
   * - si hay usuario, vuelve a pedir rol
   */
  const refreshSession = async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('Error refreshing session:', error);
        setUser(null);
        setUserRole(null);
        setLoading(false);
        return;
      }

      setUser(session?.user ?? null);

      if (session?.user?.email) {
        await fetchUserRole(session.user.email);
      } else {
        setUserRole(null);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error in refreshSession:', error);
      setUser(null);
      setUserRole(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        loading,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook de conveniencia
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};

/**
 * Export del supabase client
 */
export { supabase };

