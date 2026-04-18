'use client';
import { cn } from '@/lib/utils';
import { InvoiceStatus } from '@/types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-600',
    success: 'bg-primary-light text-primary-dark',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-600',
    info: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
  };
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold', variants[variant], className)}>
      {children}
    </span>
  );
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; variant: BadgeProps['variant'] }> = {
  draft: { label: 'Brouillon', variant: 'default' },
  sent: { label: 'Envoyée', variant: 'info' },
  paid: { label: 'Payée', variant: 'success' },
  overdue: { label: 'En retard', variant: 'danger' },
  accepted: { label: 'Acceptée', variant: 'success' },
  refused: { label: 'Refusée', variant: 'danger' },
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const config = STATUS_CONFIG[status] || { label: status, variant: 'default' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
