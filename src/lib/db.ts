import { PrismaClient } from '@prisma/client';
// Logger propio del proyecto (probablemente usa pino / winston / consola)
import logger from './logger';

/**
 * Este objeto global sirve para guardar UNA SOLA instancia de Prisma
 * entre recargas en desarrollo (hot reload).
 *
 * globalThis existe tanto en Node como en el runtime de Next.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * VALIDACIÓN TEMPRANA:
 * Si DATABASE_URL no existe, se loggea un error con contexto.
 *
 * ⚠️ Importante:
 * - NO rompe la app inmediatamente
 * - Solo deja evidencia clara en logs
 */
if (!process.env.DATABASE_URL) {
  logger.error(
    {
      environment: process.env.NODE_ENV,
      availableEnvVars: Object.keys(process.env).filter((k) =>
        k.includes('DATABASE')
      ),
    },
    'DATABASE_URL is not configured!'
  );
}

/**
 * EXPORT PRINCIPAL: prisma
 *
 * Esta línea es la más importante del archivo:
 *
 * - Si ya existe globalForPrisma.prisma → se reutiliza
 * - Si NO existe → se crea un nuevo PrismaClient
 *
 * Esto evita crear múltiples conexiones a la BD en desarrollo.
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    /**
     * LOGGING DE PRISMA
     *
     * En desarrollo:
     * - query → muestra SQL ejecutado
     * - error → errores
     * - warn → advertencias
     *
     * En producción:
     * - solo errores (menos ruido, más performance)
     */
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],

    /**
     * CONFIGURACIÓN DE DATASOURCE
     *
     * Se pasa explícitamente DATABASE_URL
     * (aunque Prisma también la lee por defecto)
     */
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

/**
 * En desarrollo:
 * guardamos la instancia en globalThis
 *
 * Así:
 * - Next.js hot reload NO crea nuevas conexiones
 * - Evita errores tipo:
 *   "Too many connections"
 */
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Export default (por compatibilidad / conveniencia)
 * Algunos archivos importan `prisma` como default.
 */
export default prisma;

