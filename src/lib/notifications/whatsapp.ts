/**
 * WhatsApp notifications via Meta Cloud API or Evolution API
 * Supports both official WhatsApp Business API and Evolution API
 */

import { env } from '../env';
import logger from '../logger';

/**
 * Normalize phone number to WhatsApp format (international format without +)
 * Examples:
 * - "3001234567" -> "573001234567" (Colombia)
 * - "+57 300 123 4567" -> "573001234567"
 * - "57 300 123 4567" -> "573001234567"
 */
function normalizePhoneNumber(phone: string): string | null {
  if (!phone) return null;

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 0) return null;

  // If it starts with 57 (Colombia country code), use as is
  if (cleaned.startsWith('57')) {
    return cleaned;
  }

  // If it's 10 digits starting with 3 (Colombian mobile), add country code
  if (cleaned.length === 10 && cleaned.startsWith('3')) {
    return `57${cleaned}`;
  }

  // If it's already in international format without country code, assume Colombia
  if (cleaned.length === 10) {
    return `57${cleaned}`;
  }

  // Return as is if it looks like international format
  if (cleaned.length >= 10) {
    return cleaned;
  }

  logger.warn({ phone, cleaned }, 'Phone number format not recognized');
  return null;
}

/**
 * Send WhatsApp message using Evolution API (preferred) or Meta API
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<void> {
  // Check if Evolution API is configured (preferred method)
  if (env.WHATSAPP_EVOLUTION_API_URL && env.WHATSAPP_EVOLUTION_API_KEY) {
    return sendViaEvolutionAPI(to, message);
  }

  // Fallback to Meta API if Evolution API is not configured
  if (env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID) {
    return sendViaMetaAPI(to, message);
  }

  logger.warn('WhatsApp not configured, skipping message');
}

/**
 * Send message via Evolution API
 */
async function sendViaEvolutionAPI(to: string, message: string): Promise<void> {
  // Normalize phone number for Evolution API (format: 573001234567)
  const normalizedPhone = normalizePhoneNumber(to);
  if (!normalizedPhone) {
    logger.warn(
      { to },
      'Invalid phone number format, skipping WhatsApp message'
    );
    return;
  }

  const instanceName = env.WHATSAPP_EVOLUTION_INSTANCE_NAME || 'default';

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (env.WHATSAPP_EVOLUTION_API_KEY) {
      headers.apikey = env.WHATSAPP_EVOLUTION_API_KEY;
    }

    const response = await fetch(
      `${env.WHATSAPP_EVOLUTION_API_URL}/message/sendText/${instanceName}`,
      {
        method: 'POST',
        headers: {
          ...headers,
        },
        body: JSON.stringify({
          number: normalizedPhone,
          text: message,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        {
          status: response.status,
          error: errorText,
          phone: normalizedPhone,
          instance: instanceName,
        },
        'Evolution API error'
      );
      throw new Error(`Evolution API error: ${response.status}`);
    }

    const result = await response.json();
    logger.info(
      { to: normalizedPhone, instance: instanceName, result },
      'WhatsApp message sent via Evolution API'
    );
  } catch (error) {
    logger.error(
      { error, to: normalizedPhone, instance: instanceName },
      'Failed to send WhatsApp message via Evolution API'
    );
    throw error;
  }
}

/**
 * Send message via Meta WhatsApp Business API
 */
async function sendViaMetaAPI(to: string, message: string): Promise<void> {
  // Normalize phone number
  const normalizedPhone = normalizePhoneNumber(to);
  if (!normalizedPhone) {
    logger.warn(
      { to },
      'Invalid phone number format, skipping WhatsApp message'
    );
    return;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: normalizedPhone,
          type: 'text',
          text: { body: message },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        { status: response.status, error: errorText, phone: normalizedPhone },
        'WhatsApp Meta API error'
      );
      throw new Error(`WhatsApp API error: ${response.status}`);
    }

    logger.info({ to: normalizedPhone }, 'WhatsApp message sent via Meta API');
  } catch (error) {
    logger.error(
      { error, to: normalizedPhone },
      'Failed to send WhatsApp message via Meta API'
    );
    throw error;
  }
}

export async function sendOrderConfirmationWhatsApp(
  phoneNumber: string,
  restaurantName: string,
  pickupTime: string,
): Promise<void> {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  if (!normalizedPhone) {
    throw new Error("Invalid phone number");
  }
  await fetch(
    `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizedPhone,
        type: "template",
        template: {
          name: "order_confirmation_upick",
          language: {
            code: "es_CO"
          },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: restaurantName },
                { type: "text", text: pickupTime }
              ]
            }
          ]
        }
      })
    }
  );
}

export async function sendOrderReadyWhatsApp(
  phoneNumber: string,
  restaurantName: string,
  restaurantLocation?: string | null
): Promise<void> {

  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  if (!normalizedPhone) {
    throw new Error("Invalid phone number");
  }

  const res = await fetch(
    `https://graph.facebook.com/v22.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizedPhone,
        type: "template",
        template: {
          name: "order_ready_upick",
          language: { code: "es_CO" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: restaurantName },
                { type: "text", text: restaurantLocation || "—" }
              ]
            }
          ]
        }
      })
    }
  );

  const data = await res.json();

  if (!res.ok) {
    logger.error(data, "WhatsApp API error");
    throw new Error("Failed to send WhatsApp message");
  }
}

export async function sendNewOrderAdminWhatsApp(
  phoneNumber: string,
  studentName?: string | null
): Promise<void> {

  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  if (!normalizedPhone) {
    throw new Error("Invalid phone number");
  }

  await fetch(
    `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizedPhone,
        type: "template",
        template: {
          name: "new_order_admin_upick",
          language: {
            code: "es_CO"
          },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: studentName || "Estudiante" }
              ]
            }
          ]
        }
      })
    }
  );
}
