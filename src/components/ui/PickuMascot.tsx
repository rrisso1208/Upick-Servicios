/**
 * Picku Mascot Component
 * Displays Picku mascot in different contexts
 */

'use client';

import Image from 'next/image';

interface PickuMascotProps {
  variant?:
    | 'default'
    | 'ready'
    | 'complete'
    | 'thinking'
    | 'jumping'
    | 'waving'
    | 'pointing'
    | 'chef'
    | 'logo'
    | 'paid'
    | 'in_progress'
    | 'delivered'
    | 'cancelled'
    | 'querico';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
  showText?: boolean;
  text?: string;
}

const pickuVariants = {
  default: '/picku/picku-default.png',
  ready: '/picku/picku-ready.png', // "¡Picku, pedido listo!"
  complete: '/picku/picku-complete.png', // "¡Orden Completa!"
  thinking: '/picku/picku-thinking.png', // "Picku, Pensando en Tu Elección"
  jumping: '/picku/picku-jumping.png', // "¡Salta la espera!"
  waving: '/picku/picku-waving.png', // "¡Picku, a Saltar!"
  pointing: '/picku/picku-pointing.png',
  chef: '/picku/picku-chef.png', // Picku con sombrero de chef
  logo: '/picku/picku-logo.png', // Logo/app icon
  paid: '/picku/picku-waving.png', // Picku saludando cuando está pagado
  in_progress: '/picku/picku-chef (2).png', // Picku cocinando cuando está en preparación
  delivered: '/picku/picku-complete (2).png', // Picku feliz cuando fue entregado
  cancelled: '/picku/picku-thinking.png', // Picku pensativo cuando fue cancelado
  querico: '/picku/picku-querico.png', // Picku diciendo "¡Qué rico!"
};

const sizeClasses = {
  sm: 'w-16 h-16', // 64px - Para elementos muy pequeños
  md: 'w-28 h-28', // 112px - Aumentado de 96px para mejor visibilidad
  lg: 'w-40 h-40', // 160px - Aumentado de 128px para destacar más
  xl: 'w-56 h-56', // 224px - Aumentado de 192px para máximo impacto
  '2xl': 'w-80 h-80', // 320px - Para páginas de estado vacío destacadas
  '3xl': 'w-96 h-96', // 384px - Para máximo impacto visual
};

const defaultTexts: Record<string, string> = {
  ready: '¡Picku, pedido listo!',
  complete: '¡Orden Completa!',
  thinking: 'Picku, Pensando en Tu Elección',
  jumping: '¡Salta la espera!',
  waving: '¡Picku, a Saltar!',
  pointing: '¡Mira por aquí!',
  chef: '¡Picku Chef está listo para cocinar!',
  logo: '¡Hola! Soy Picku',
  default: '¡Hola! Soy Picku',
  paid: '¡Pago recibido! Tu pedido está en cola 🎉',
  in_progress: '👨‍🍳 Picku está preparando tu pedido con mucho cariño',
  delivered: '¡Gracias por tu pedido! Picku espera verte pronto 🎉',
  cancelled: 'Picku entiende, a veces las cosas cambian',
  querico: '¡Qué rico! 😋',
};

export function PickuMascot({
  variant = 'default',
  size = 'md',
  className = '',
  showText = false,
  text,
}: PickuMascotProps) {
  const imageSrc = pickuVariants[variant];
  const displayText = text || defaultTexts[variant] || defaultTexts.default;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`relative ${sizeClasses[size]}`}>
        <Image
          src={imageSrc}
          alt="Picku - Mascota de Upick"
          fill
          className="object-contain"
          priority={variant === 'logo'}
        />
      </div>
      {showText && (
        <div className="mt-4 text-center">
          <div className="rounded-lg bg-primary-600 px-4 py-2">
            <p className="font-bold text-white">{displayText}</p>
          </div>
        </div>
      )}
    </div>
  );
}
