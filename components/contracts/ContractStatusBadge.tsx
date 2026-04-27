'use client';
import React from 'react';
import { ContractStatus } from '@/types';

const STATUS_CONFIG: Record<ContractStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Brouillon', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' },
  pending_signature: { label: 'En attente', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  signed: { label: 'Signé', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  active: { label: 'Actif', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
  ended: { label: 'Terminé', color: 'text-gray-500 dark:text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' },
  terminated: { label: 'Rompus', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
  cancelled: { label: 'Annulé', color: 'text-gray-500 dark:text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' },
};

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  cdi: { label: 'CDI', color: 'text-primary', bg: 'bg-primary/10' },
  cdd: { label: 'CDD', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  other: { label: 'Autre', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
};

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.color}`}>
      {config.label}
    </span>
  );
}

export function ContractTypeBadge({ type }: { type: string }) {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.other;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.color}`}>
      {config.label}
    </span>
  );
}
