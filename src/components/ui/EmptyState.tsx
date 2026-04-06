/**
 * Empty State Component with Picku
 * Shows Picku when there's no content to display
 */

'use client';

import { PickuMascot } from './PickuMascot';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'orders' | 'favorites' | 'search';
}

const variantConfig = {
  default: {
    variant: 'thinking' as const,
    text: 'Picku está pensando...',
  },
  orders: {
    variant: 'waving' as const,
    text: '¡Aún no tienes pedidos!',
  },
  favorites: {
    variant: 'thinking' as const,
    text: 'Aún no tienes favoritos',
  },
  search: {
    variant: 'thinking' as const,
    text: 'No se encontraron resultados',
  },
};

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  variant = 'default',
}: EmptyStateProps) {
  const config = variantConfig[variant];

  return (
    <div className="flex flex-col items-center justify-center px-4 py-12">
      <PickuMascot
        variant={config.variant}
        size="xl"
        showText
        text={config.text}
      />
      <h3 className="mt-6 text-xl font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-center text-gray-600">{description}</p>
      )}
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-primary mt-6">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
