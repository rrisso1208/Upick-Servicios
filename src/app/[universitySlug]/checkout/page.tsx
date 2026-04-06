/**
 * Checkout page - Complete flow with cart, slots, and payment
 *
 * OJO: Aunque el comentario dice “flow completo”, ESTE archivo NO maneja el flujo completo.
 * En App Router, normalmente:
 *  - page.tsx (Server Component) = trae datos iniciales desde DB (Prisma) y valida params
 *  - CheckoutClient (Client Component) = maneja estado, UI, llamadas fetch a APIs, etc.
 */

import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { CheckoutClient } from './CheckoutClient';

// ⚠️ IMPORT INNECESARIO EN ESTE ARCHIVO
// Se importa getAvailableSlots pero NO se usa aquí.
// Puede ser:
// 1) sobrante de refactor
// 2) lo iban a usar en server para pre-cargar slots y luego lo movieron al cliente
import { getAvailableSlots } from '../../../lib/slots';

export default async function CheckoutPage({
                                             params,
                                           }: {
  // En App Router, params llega como objeto.
  // Aquí lo tiparon como Promise, por eso hacen "await params".
  // No es lo más común, pero funciona si en el proyecto lo tipan así.
  params: Promise<{ universitySlug: string }>;
}) {
  // Extraemos el slug dinámico de la URL: /[universitySlug]/checkout
  const { universitySlug } = await params;

  // Buscamos el "place" (campus / universidad / lugar) en la base de datos
  // usando Prisma.
  // select: trae solo lo necesario (más eficiente que traer todo)
  const place = await prisma.place.findUnique({
    where: { slug: universitySlug },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  // Si NO existe ese lugar, devolvemos 404 automáticamente
  // notFound() en Next App Router muestra la página de not-found
  if (!place) {
    notFound();
  }

  /**
   * Renderizamos el componente CLIENTE (CheckoutClient)
   * y le pasamos el lugar encontrado como prop.
   *
   * A partir de aquí, el flujo real (reservar slot, crear orden, etc.)
   * pasa dentro de CheckoutClient.
   */
  return <CheckoutClient university={place} />;
}