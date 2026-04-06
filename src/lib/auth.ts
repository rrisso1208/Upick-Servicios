import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers'; // cookies del request (SERVER)
import { createClient } from '@supabase/supabase-js'; // cliente supabase normal
import { env } from './env'; // wrapper tipado para variables de entorno
import { prisma } from './db';
import { Role } from '@prisma/client'; // enum Role del schema Prisma

/**
 * createSupabaseServerClient()
 *
 * ✅ Se usa en el SERVIDOR (route handlers / server actions)
 * ✅ Lee y escribe cookies del request actual
 *
 * ¿Para qué sirve?
 * - Para que supabase.auth.getUser() funcione usando la sesión guardada en cookies
 *   (si el usuario está logueado en el navegador)
 */
export async function createSupabaseServerClient() {
  // cookieStore representa las cookies del request actual
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      /**
       * Adaptador de cookies para Supabase SSR
       * Supabase necesita poder leer y escribir cookies de auth.
       */
      cookies: {
        // Leer cookie por nombre
        get(name: string) {
          return cookieStore.get(name)?.value;
        },

        // Escribir cookie
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            /**
             * En algunos contextos (por ejemplo ciertos renders),
             * Next no permite setear cookies. Por eso lo envuelven en try/catch.
             */
          }
        },

        // "Eliminar" cookie (la setean vacía)
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Igual: algunos contextos no dejan modificar cookies
          }
        },
      },
    }
  );
}

/**
 * supabaseAdmin
 *
 * ✅ Cliente "admin" usando SUPABASE_SERVICE_ROLE_KEY (privada)
 *
 * OJO MUY IMPORTANTE:
 * - Esto SOLO debe ejecutarse en servidor (nunca en cliente)
 * - La service role key puede "hacer de todo"
 *
 * Aquí la usan para validar un Bearer token:
 * supabaseAdmin.auth.getUser(token)
 */
export const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * AuthUser
 *
 * Este es el "usuario autenticado" que tu backend usa internamente.
 *
 * Importante: el role viene de Prisma (enum Role)
 * NO viene de Supabase.
 */
export interface AuthUser {
  id: string;
  centralId?: string | null;
  email: string;
  role: Role;
  placeId?: string | null;
  restaurantId?: string | null;
}

/**
 * getAuthUser()
 *
 * ✅ Método #1: Autenticación por cookies/sesión
 *
 * Flujo:
 * 1) Supabase SSR client lee cookies del request
 * 2) supabase.auth.getUser() devuelve user (email)
 * 3) Con ese email, busca el usuario en Prisma para obtener role y relaciones
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createSupabaseServerClient();

    // Supabase intenta reconstruir usuario usando cookies
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Si hay error, muchas veces es normal (usuario NO logueado)
    if (authError) {
      const isExpectedError =
        authError.message?.includes('Auth session missing') ||
        authError.message?.includes('session') ||
        authError.name === 'AuthSessionMissingError';

      // Solo loguea si NO es un error esperado
      if (!isExpectedError) {
        console.error('Supabase auth error:', authError);
      }

      return null;
    }

    // Si no hay user o no hay email, no hay sesión válida
    if (!user || !user.email) {
      return null;
    }

    console.log('getAuthUser - Supabase user found:', user.email);

    /**
     * Buscar el usuario real en tu base de datos (Prisma)
     *
     * Esto es CLAVE:
     * - Supabase dice "existe un usuario con email X"
     * - Pero TU APP necesita:
     *   - role (student/admin/etc.)
     *   - restaurantId/placeId/centralId
     */
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        role: true,
        placeId: true,
        restaurantId: true,
        centralId: true,
      },
    });

    if (!dbUser) {
      // Caso: usuario existe en Supabase pero NO existe en tu BD Prisma
      console.log('getAuthUser - User not found in database:', user.email);
      return null;
    }

    console.log('getAuthUser - Database user found:', {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      restaurantId: dbUser.restaurantId,
    });

    return dbUser;
  } catch (error) {
    console.error('Error in getAuthUser:', error);
    return null;
  }
}

/**
 * getAuthUserFromHeader(authHeader)
 *
 * ✅ Método #2: Autenticación por Authorization: Bearer <token>
 *
 * Flujo:
 * 1) Recibe el header completo
 * 2) Extrae el token
 * 3) Usa supabaseAdmin.auth.getUser(token) para validarlo y obtener email
 * 4) Con el email, busca el usuario en Prisma (igual que getAuthUser)
 *
 * Esto es lo que usa /api/student/credits cuando UserMenu manda Bearer token.
 */
export async function getAuthUserFromHeader(
  authHeader: string | null
): Promise<AuthUser | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('getAuthUserFromHeader - No Bearer token in header');
    return null;
  }

  try {
    // Extrae token quitando "Bearer "
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token || token.length === 0) {
      console.log('getAuthUserFromHeader - Empty token');
      return null;
    }

    console.log(
      'getAuthUserFromHeader - Validating token, length:',
      token.length
    );

    /**
     * Validación del token usando Service Role Key
     *
     * ✅ Esto sirve para verificar si el token es válido y obtener el user
     * ⚠️ Si esta key se filtrara, es grave (por eso nunca en frontend)
     */
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error) {
      // Tokens inválidos/expirados son esperables
      const isExpectedError =
        error.message?.includes('session') ||
        error.message?.includes('token') ||
        error.message?.includes('invalid') ||
        error.message?.includes('expired') ||
        error.name === 'AuthSessionMissingError';

      if (!isExpectedError) {
        console.error('getAuthUserFromHeader - Supabase error:', error.message);
      }

      return null;
    }

    if (!user || !user.email) {
      console.log('getAuthUserFromHeader - No user or email from Supabase');
      return null;
    }

    console.log('getAuthUserFromHeader - Supabase user found:', user.email);

    // Igual que antes: buscar rol y relaciones en Prisma
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        role: true,
        placeId: true,
        restaurantId: true,
        centralId: true,
      },
    });

    if (!dbUser) {
      console.log(
        'getAuthUserFromHeader - User not found in database:',
        user.email
      );
      return null;
    }

    console.log('getAuthUserFromHeader - Database user found:', {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      restaurantId: dbUser.restaurantId,
    });

    return dbUser;
  } catch (error) {
    console.error('Error in getAuthUserFromHeader:', error);
    return null;
  }
}

/**
 * requireAuth()
 *
 * ✅ Atajo:
 * - si no hay usuario => lanza Error('Unauthorized')
 *
 * Usado cuando un endpoint OBLIGA login.
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

/**
 * requireRole(allowedRoles)
 *
 * ✅ Atajo:
 * - exige login
 * - exige que el rol esté permitido
 *
 * Ej:
 * await requireRole(['superadmin', 'restaurant_admin'])
 */
export async function requireRole(allowedRoles: Role[]): Promise<AuthUser> {
  const user = await requireAuth();

  if (!allowedRoles.includes(user.role)) {
    throw new Error('Forbidden: Insufficient permissions');
  }

  return user;
}

/**
 * requireRestaurantAccess(restaurantId)
 *
 * ✅ Regla de acceso:
 * - superadmin puede todo
 * - restaurant_admin solo si su restaurantId coincide
 * - si no => forbidden
 */
export async function requireRestaurantAccess(
  restaurantId: string
): Promise<AuthUser> {
  const user = await requireAuth();

  if (user.role === 'superadmin') {
    return user;
  }

  if (user.role === 'restaurant_admin' && user.restaurantId === restaurantId) {
    return user;
  }

  throw new Error('Forbidden: No access to this restaurant');
}

/**
 * requirePlaceAccess(placeId)
 *
 * ✅ Regla de acceso:
 * - superadmin puede todo
 * - cualquiera puede acceder si su placeId coincide
 */
export async function requirePlaceAccess(placeId: string): Promise<AuthUser> {
  const user = await requireAuth();

  if (user.role === 'superadmin') {
    return user;
  }

  if (user.placeId === placeId) {
    return user;
  }

  throw new Error('Forbidden: No access to this place');
}
