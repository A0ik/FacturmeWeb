'use client';

import { motion } from 'framer-motion';
import { FileText, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Invoice } from '@/types';
import { StatusBadge } from '@/components/ui/Badge';
import { glassTokens } from './constants';

interface InvoiceCardProps {
  invoice: Invoice;
  className?: string;
}

export function InvoiceCard({ invoice, className }: InvoiceCardProps) {
  const isOverdue = invoice.status === 'overdue';

  return (
    <Link href={`/invoices/${invoice.id}`}>
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        className={cn(
          'relative w-full text-left flex items-center justify-between gap-3 p-3 rounded-xl',
          'bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm',
          'border border-white/20 dark:border-white/10',
          'hover:bg-white/70 dark:hover:bg-slate-700/50 hover:border-primary/20',
          'transition-all duration-200 cursor-pointer',
          isOverdue && 'bg-red-50/30 dark:bg-red-900/10 border-red-200/30 dark:border-red-800/20',
          className
        )}
      >
        {/* Left: Icon + Status */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              isOverdue
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
            )}
          >
            {isOverdue ? <AlertCircle className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="text-sm font-bold text-gray-900 dark:text-white">
              {invoice.number}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {invoice.client?.name || invoice.client_name_override || 'Client'}
            </div>
          </div>
        </div>

        {/* Right: Amount + Status */}
        <div className="flex flex-col items-end gap-1">
          <div className="text-sm font-bold text-gray-900 dark:text-white">
            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(invoice.total)}
          </div>
          <StatusBadge status={invoice.status} />
        </div>
      </motion.div>
    </Link>
  );
}
