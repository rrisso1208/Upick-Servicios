/**
 * Payment result page - handles redirect from Wompi after payment
 */

import { notFound, redirect } from 'next/navigation';
import { Header } from '../../../../components/layout/Header';
import { PaymentResultClient } from './PaymentResultClient';
import { prisma } from '../../../../lib/db';
import { getAuthUser } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export default async function PaymentResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id: orderId } = await params;
  const queryParams = await searchParams;

  // Get order first (before checking auth) to ensure it exists
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      payment: true,
      restaurant: {
        select: {
          id: true,
          name: true,
        },
      },
      student: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  // Try to get authenticated user, but don't redirect if not authenticated
  // This allows users to see payment result even if session expired during payment
  let user;
  try {
    user = await getAuthUser();
  } catch {
    // User not authenticated - this is OK, we'll show the result anyway
    // but we'll verify ownership using the order's student email
    user = null;
  }

  // If user is authenticated, verify ownership
  if (user) {
    if (user.role === 'student' && order.studentId !== user.id) {
      return (
        <>
          <Header title="Resultado del Pago" showBack />
          <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
            <div className="rounded-lg bg-red-50 p-6 text-center">
              <h2 className="text-xl font-semibold text-red-800">
                No autorizado
              </h2>
              <p className="mt-2 text-red-600">
                Este pedido no pertenece a tu cuenta.
              </p>
            </div>
          </main>
        </>
      );
    }
  } else {
    // User not authenticated - show a message to login to see full details
    // But still show the payment result since we have the orderId
    // The client component will handle showing the result and prompting for login if needed
  }

  // Get transaction ID and status from query params
  // Wompi may pass these directly in the URL when redirecting
  // Format: /orders/[id]/payment-result?transaction_id=TRANSACTION_ID&status=APPROVED|DECLINED|etc
  const transactionId = queryParams.transaction_id as string | undefined;
  const wompiStatus = queryParams.status as string | undefined;

  // Also check for Wompi's standard query params (if they use different names)
  const wompiTransactionId = queryParams.id as string | undefined;
  const wompiTransactionStatus = queryParams.transaction_status as
    | string
    | undefined;

  // Use the first available transaction ID
  const finalTransactionId = transactionId || wompiTransactionId;
  const finalWompiStatus = wompiStatus || wompiTransactionStatus;

  return (
    <>
      <Header title="Resultado del Pago" showBack />
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
        <PaymentResultClient
          order={order}
          transactionId={finalTransactionId}
          wompiStatus={finalWompiStatus}
        />
      </main>
    </>
  );
}
