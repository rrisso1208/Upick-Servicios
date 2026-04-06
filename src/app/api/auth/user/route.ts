/**
 * GET /api/auth/user
 * Get user info including role
 *
 * ✅ Qué hace:
 * - Recibe ?email=...
 * - Valida que exista y que sea formato válido
 * - Verifica que DATABASE_URL esté configurado
 * - Consulta en Prisma el usuario por email
 * - Si existe y está activo => devuelve datos + role
 *
 * 🔗 Quién lo usa:
 * - AuthProvider → fetchUserRole(email)
 *   (para saber si el usuario es student / admin / etc.)
 */

import { NextRequest, NextResponse } from 'next/server';

// Obliga a que esta ruta sea dinámica (sin cache raro)
// Normalmente en APIs es buena idea si depende de DB y auth
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    /**
     * 1) LEER QUERY PARAMS
     * req.url contiene la URL completa (incluye query string)
     */
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    /**
     * 2) VALIDACIÓN: email es requerido
     */
    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    /**
     * 3) VALIDACIÓN: formato email básico
     * (evita basura, e.g. "hola", "", etc.)
     */
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    console.log('Fetching user for email:', email);

    /**
     * 4) VALIDACIÓN: DATABASE_URL debe existir
     *
     * Si falta, Prisma no puede conectar.
     * Devuelven 503 porque es "servicio no disponible" por config.
     */
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL is not configured');
      return NextResponse.json(
        {
          error: 'Database configuration error',
          details: 'DATABASE_URL environment variable is not set.',
        },
        { status: 503 }
      );
    }

    /**
     * 5) IMPORT DINÁMICO de prisma
     *
     * Lo hacen para evitar "issues" (normalmente en serverless/hot reload)
     * También puede evitar problemas de import en build.
     */
    const { prisma } = await import('../../../../lib/db');

    /**
     * 6) CONSULTA A LA BD con timeout (8s)
     *
     * Promise.race:
     * - o termina prisma.user.findUnique(...)
     * - o se dispara el timeout y lanza error
     *
     * Nota: buscan por email en minúsculas y sin espacios.
     */
    let user;
    try {
      user = (await Promise.race([
        prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
          select: {
            // Devuelven solo campos necesarios (mejor performance y seguridad)
            id: true,
            email: true,
            role: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            documentType: true,
            documentNumber: true,
            placeId: true,
            restaurantId: true,
            isActive: true,
          },
        }),

        // Timeout manual: si pasan 8 segundos => error
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database query timeout')), 8000)
        ),
      ])) as any; // ⚠️ "as any" para evitar errores de tipado (luego lo mejoramos)
    } catch (dbError: any) {
      /**
       * 7) MANEJO DE ERRORES DE BD
       * Loggea info típica de Prisma (code P1001, meta, etc.)
       */
      console.error('Database query error:', {
        message: dbError.message,
        code: dbError.code,
        meta: dbError.meta,
      });

      /**
       * 8) Si detecta que es error de conexión, responde 503 con hint
       *
       * Esto está pensado para casos típicos en Vercel + Supabase:
       * - DB inaccesible
       * - credenciales malas
       * - puerto incorrecto
       * - pgbouncer (session pooler)
       */
      if (
        dbError.message?.includes('timeout') ||
        dbError.message?.includes("Can't reach database") ||
        dbError.code === 'P1001' ||
        dbError.message?.includes('ECONNREFUSED') ||
        dbError.message?.includes('P1000') ||
        dbError.message?.includes('connection')
      ) {
        return NextResponse.json(
          {
            error: 'Database connection error',
            details:
              'Unable to connect to the database. Please check DATABASE_URL configuration in Vercel.',
            hint:
              'Make sure DATABASE_URL uses port 6543 (Session Pooler) for Supabase: postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:6543/postgres?pgbouncer=true',
          },
          { status: 503 }
        );
      }

      // Si no era conexión, deja que el error suba al catch general
      throw dbError;
    }

    /**
     * 9) LOG de resultado
     * (no imprime todo el usuario, solo campos “seguros”)
     */
    console.log(
      'User found:',
      user
        ? {
          id: user.id,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        }
        : 'null'
    );

    /**
     * 10) Si NO existe => 404
     * Esto ayuda al AuthProvider: si es 404 no reintenta.
     */
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    /**
     * 11) Si el usuario existe pero está inactivo => 403 (forbidden)
     * Es decir: sí existe pero no tiene permiso de usar el sistema.
     */
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'User is not active' },
        { status: 403 }
      );
    }

    /**
     * 12) RESPUESTA EXITOSA
     * Devuelve información del usuario que puede usar el frontend.
     */
    return NextResponse.json({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      documentType: user.documentType,
      documentNumber: user.documentNumber,
      placeId: user.placeId,
      restaurantId: user.restaurantId,
      isActive: user.isActive,
    });
  } catch (error) {
    /**
     * 13) CATCH GENERAL
     * Cualquier error no manejado arriba cae aquí.
     */
    console.error('Error in /api/auth/user:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    /**
     * 14) Caso específico: error Prisma de conexión
     */
    if (
      errorMessage.includes("Can't reach database") ||
      errorMessage.includes('P1001')
    ) {
      return NextResponse.json(
        {
          error: 'Database connection error',
          details: 'Unable to connect to the database. Please try again later.',
        },
        { status: 503 }
      );
    }

    /**
     * 15) Error genérico 500
     * En development incluyen stack (para debug)
     */
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack }),
      },
      { status: 500 }
    );
  }
}

