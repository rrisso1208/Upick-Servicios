import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { OrderReceipt } from '@/components/ui/OrderReceipt'

export const runtime = 'nodejs' // importante si usas prisma

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function PrintReceiptPage({ params }: PageProps) {
  const { id } = await params // 👈🔥 AQUÍ ESTÁ EL FIX

  const orderRaw = await prisma.order.findUnique({
    where: { id },
    include: {
      restaurant: true,
      deliveryPoint: true,
      coupon: true,
      items: {
        include: {
          product: true,
          options: {
            include: {
              productOption: {
                include: { group: true }
              }
            }
          }
        }
      }
    }
  })

  if (!orderRaw) return notFound()

// 👇🔥 convertir Decimal a JSON plano
  const order = JSON.parse(JSON.stringify(orderRaw))

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="mx-auto max-w-md">
        <OrderReceipt order={order as any} />
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
      window.onload = function() {
        setTimeout(() => {
          window.print();
        }, 300);

        window.onafterprint = function() {
          window.close();
        };
      }
    `
        }}
      />
    </div>
  )
}