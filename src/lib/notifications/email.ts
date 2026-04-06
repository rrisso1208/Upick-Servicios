/**
 * Email notifications via Resend
 */

import { Resend } from 'resend';
import { env } from '../env';
import logger from '../logger';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export interface OrderReceiptEmailData {
  orderId: string;
  customerEmail: string;
  customerName: string;
  restaurantName: string;
  pickupTime: string;
  pickupCode: string;
  totalAmount: string;
  items: Array<{
    name: string;
    quantity: number;
    price: string;
  }>;
  receiptUrl: string;
}

export async function sendOrderReceiptEmail(
  data: OrderReceiptEmailData
): Promise<void> {
  if (!resend) {
    logger.warn('Resend not configured, skipping email');
    return;
  }

  try {
    const html = generateReceiptEmailHtml(data);

    await resend.emails.send({
      from: 'Upick <noreply@upick.app>',
      to: data.customerEmail,
      subject: `Pedido confirmado - ${data.restaurantName}`,
      html,
    });

    logger.info({ orderId: data.orderId }, 'Order receipt email sent');
  } catch (error) {
    logger.error({ error, orderId: data.orderId }, 'Failed to send email');
  }
}

function generateReceiptEmailHtml(data: OrderReceiptEmailData): string {
  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0ea5e9; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .pickup-code { font-size: 32px; font-weight: bold; text-align: center; 
                         background: white; padding: 20px; margin: 20px 0; 
                         border-radius: 8px; letter-spacing: 4px; }
          .details { background: white; padding: 15px; margin: 15px 0; border-radius: 8px; }
          .item { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .total { font-size: 18px; font-weight: bold; padding: 15px 0; }
          .button { display: inline-block; background: #0ea5e9; color: white; 
                    padding: 12px 24px; text-decoration: none; border-radius: 6px; 
                    margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>¡Pedido Confirmado!</h1>
          </div>
          <div class="content">
            <p>Hola ${data.customerName},</p>
            <p>Tu pedido en <strong>${data.restaurantName}</strong> ha sido confirmado.</p>
            
            <div class="pickup-code">
              ${data.pickupCode}
            </div>
            
            <div class="details">
              <p><strong>Hora de recogida:</strong> ${data.pickupTime}</p>
              <p><strong>Restaurante:</strong> ${data.restaurantName}</p>
            </div>
            
            <div class="details">
              <h3>Resumen del pedido:</h3>
              ${data.items
                .map(
                  (item) => `
                <div class="item">
                  <span>${item.quantity}x ${item.name}</span>
                  <span style="float: right;">${item.price}</span>
                </div>
              `
                )
                .join('')}
              <div class="total">
                <span>Total:</span>
                <span style="float: right;">${data.totalAmount}</span>
              </div>
            </div>
            
            <p style="text-align: center;">
              <a href="${data.receiptUrl}" class="button">Ver Comprobante</a>
            </p>
            
            <p style="color: #666; font-size: 14px;">
              Presenta tu código al momento de recoger tu pedido.
              Si tienes alguna pregunta, contacta directamente al restaurante.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function sendPaymentDeclinedEmail(
  customerEmail: string,
  orderId: string,
  reason?: string
): Promise<void> {
  if (!resend) return;

  try {
    await resend.emails.send({
      from: 'UPIC <noreply@upic.app>',
      to: customerEmail,
      subject: 'Pago no procesado',
      html: `
        <p>Tu pago para el pedido <strong>${orderId}</strong> no pudo ser procesado.</p>
        <p>Razón: ${reason || 'No especificada'}</p>
        <p>Por favor, intenta nuevamente.</p>
      `,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to send declined email');
  }
}

