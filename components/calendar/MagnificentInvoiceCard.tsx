'use client';

import { motion, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FileText, DollarSign } from 'lucide-react';
import { Invoice } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface MagnificentInvoiceCardProps {
  invoice: Invoice;
  className?: string;
}

export function MagnificentInvoiceCard({
  invoice,
  className,
}: MagnificentInvoiceCardProps) {
  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  const isOverdue = invoice.status === 'overdue';
  const isSent = invoice.status === 'sent';

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ scale: 1.02, y: -2 }}
      className={cn(
        'relative overflow-hidden rounded-2xl',
        'bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm',
        'border border-white/30 dark:border-white/10',
        'hover:border-accent/30 dark:hover:border-accent/20',
        'hover:shadow-lg hover:shadow-accent/10',
        'transition-all duration-300',
        'p-4',
        className
      )}
    >
      {/* Status indicator */}
      <div className={cn(
        'absolute left-0 top-0 bottom-0 w-1',
        isOverdue && 'bg-gradient-to-b from-red-500 to-orange-500',
        isSent && !isOverdue && 'bg-gradient-to-b from-accent to-orange-600',
        'rounded-l-2xl'
      )} />

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className={cn(
            'w-12 h-12 rounded-xl',
            isOverdue
              ? 'bg-gradient-to-br from-red-500/10 to-orange-500/10 dark:from-red-500/20 dark:to-orange-500/20'
              : 'bg-gradient-to-br from-accent/10 to-orange-500/10 dark:from-accent/20 dark:to-orange-500/20',
            'flex items-center justify-center',
            'border',
            isOverdue
              ? 'border-red-200 dark:border-red-800'
              : 'border-accent/30 dark:border-accent/20'
          )}>
            <FileText className={cn(
              'w-5 h-5',
              isOverdue ? 'text-red-500' : 'text-accent'
            )} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
              {invoice.client_name_override || invoice.client?.name || 'Client'}
            </h4>
            {invoice.number && (
              <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                #{invoice.number}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3 h-3 text-gray-400" />
              <span className={cn(
                'text-sm font-bold tabular-nums',
                isOverdue
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-900 dark:text-white'
              )}>
                {formatCurrency(invoice.total || 0)}
              </span>
            </div>

            <div className={cn(
              'text-[10px] font-semibold px-2 py-0.5 rounded-full',
              isOverdue
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-light'
            )}>
              {isOverdue ? 'En retard' : 'Envoyée'}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
