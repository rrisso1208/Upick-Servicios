// Simplified env to avoid build errors
// Using process.env directly for deployment

export const env = {
  // Server
  DATABASE_URL: process.env.DATABASE_URL!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  WOMPI_PRIVATE_KEY: process.env.WOMPI_PRIVATE_KEY!,
  WOMPI_WEBHOOK_SECRET: process.env.WOMPI_WEBHOOK_SECRET!,
  WOMPI_API_URL: process.env.WOMPI_API_URL || 'https://sandbox.wompi.co/v1',
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  // WhatsApp - Evolution API (preferred, easier to setup)
  WHATSAPP_EVOLUTION_API_URL: process.env.WHATSAPP_EVOLUTION_API_URL,
  WHATSAPP_EVOLUTION_API_KEY: process.env.WHATSAPP_EVOLUTION_API_KEY,
  WHATSAPP_EVOLUTION_INSTANCE_NAME:
    process.env.WHATSAPP_EVOLUTION_INSTANCE_NAME || 'default',
  // WhatsApp - Meta Business API (alternative)
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
  SENTRY_DSN: process.env.SENTRY_DSN,
  DEFAULT_COMMISSION_RATE: process.env.DEFAULT_COMMISSION_RATE || '0.04',
  COMMISSION_BASE_MODE: process.env.COMMISSION_BASE_MODE || 'subtotal_plus_tax',
  // Privacy & Contact
  PRIVACY_EMAIL: process.env.PRIVACY_EMAIL || 'u.pickcompany@gmail.com',

  // Client
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL!,
  NEXT_PUBLIC_PRIVACY_EMAIL:
    process.env.NEXT_PUBLIC_PRIVACY_EMAIL ||
    process.env.PRIVACY_EMAIL ||
    'u.pickcompany@gmail.com',
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  NEXT_PUBLIC_WOMPI_PUBLIC_KEY: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY!,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
};
