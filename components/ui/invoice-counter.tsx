"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, AlertTriangle, X, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface InvoiceCounterProps {
  invoiceCount: number;
  maxInvoices: number;
  onClose?: () => void;
  className?: string;
}

export function InvoiceCounter({ invoiceCount, maxInvoices, onClose, className }: InvoiceCounterProps) {
  const [isVisible, setIsVisible] = React.useState(true);
  const [isPulsing, setIsPulsing] = React.useState(false);

  const remaining = Math.max(0, maxInvoices - invoiceCount);
  const percentage = (invoiceCount / maxInvoices) * 100;
  const isNearLimit = remaining <= 2;
  const isAtLimit = remaining === 0;

  React.useEffect(() => {
    if (isNearLimit && !isAtLimit) {
      const pulse = setInterval(() => {
        setIsPulsing(prev => !prev);
      }, 1500);
      return () => clearInterval(pulse);
    }
  }, [isNearLimit, isAtLimit]);

  if (!isVisible) return null;

  const getColors = () => {
    if (isAtLimit) {
      return {
        bg: 'bg-red-50 dark:bg-red-950/30',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-700 dark:text-red-400',
        progress: 'bg-red-500',
        icon: 'text-red-500',
      };
    } else if (isNearLimit) {
      return {
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        border: 'border-amber-200 dark:border-amber-800',
        text: 'text-amber-700 dark:text-amber-400',
        progress: 'bg-amber-500',
        icon: 'text-amber-500',
      };
    }
    return {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-400',
      progress: 'bg-blue-500',
      icon: 'text-blue-500',
    };
  };

  const colors = getColors();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{
          opacity: 1,
          x: 0,
          scale: isPulsing ? 1.02 : 1,
        }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "fixed top-16 left-4 z-40 max-w-sm rounded-lg shadow-xl",
          colors.bg,
          colors.border,
          "border-2",
          className
        )}
      >
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {isAtLimit ? (
                <Lock className={`w-5 h-5 ${colors.icon}`} />
              ) : (
                <FileText className={`w-5 h-5 ${colors.icon}`} />
              )}
              <div>
                <h3 className={cn("font-semibold text-sm", colors.text)}>
                  {isAtLimit ? 'Limite atteinte' : 'Compteur de factures'}
                </h3>
                <p className={cn("text-xs", colors.text, "opacity-80")}>
                  Plan Gratuit
                </p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={() => {
                  setIsVisible(false);
                  onClose?.();
                }}
                className={cn(
                  "p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors",
                  colors.text
                )}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className={cn("font-medium", colors.text)}>
                {invoiceCount} / {maxInvoices} factures
              </span>
              <span className={cn("text-xs", colors.text, "opacity-80")}>
                {remaining} restante{remaining > 1 ? 's' : ''}
              </span>
            </div>

            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={cn("h-full rounded-full", colors.progress)}
              />
            </div>

            {isNearLimit && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-start gap-2 pt-2 border-t border-black/10 dark:border-white/10"
              >
                <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${colors.icon}`} />
                <p className={cn("text-xs", colors.text)}>
                  {isAtLimit
                    ? "Vous avez atteint votre limite. Passez à Pro pour créer des factures illimitées."
                    : `Attention, il ne vous reste que ${remaining} facture${remaining > 1 ? 's' : ''}. Passez à Pro pour des factures illimitées !`
                  }
                </p>
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.location.href = '/paywall'}
              className={cn(
                "w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors",
                isAtLimit
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              )}
            >
              {isAtLimit ? 'Débloquer maintenant' : 'Passer à Pro'}
            </motion.button>
          </div>
        </div>

        {isAtLimit && (
          <motion.div
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 pointer-events-none border-4 border-red-400 rounded-lg"
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
