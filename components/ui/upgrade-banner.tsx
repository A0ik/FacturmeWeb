"use client";

import * as React from "react";
import { X, AlertTriangle } from "lucide-react";
import { AnimatePresence, motion, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

interface UpgradeBannerProps {
  buttonText?: string;
  description?: string;
  onClose?: () => void;
  onClick?: () => void;
  className?: string;
  type?: 'warning' | 'trial' | 'limit';
}

const WarningIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 9V14"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="12"
      cy="17"
      r="1"
      fill="currentColor"
    />
    <path
      d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function UpgradeBanner({
  buttonText = "Passer à Pro",
  description = "pour débloquer toutes les fonctionnalités",
  onClose,
  onClick,
  className,
  type = 'warning'
}: UpgradeBannerProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const iconVariantBase = {
    hidden: { x: 0, y: 0, opacity: 0, rotate: -15 },
    visible: {
      opacity: 1,
      rotate: 0,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  const iconVariants: Variants = {
    hidden: { x: 0, y: 0, opacity: 0, rotate: -15 },
    topLeft: {
      x: -10,
      y: -10,
      opacity: 1,
      rotate: 0,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
    bottomRight: {
      x: 10,
      y: 10,
      opacity: 1,
      rotate: 0,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  const getColors = () => {
    switch (type) {
      case 'trial':
        return {
          border: 'border-[#FFE66D]',
          bg: 'bg-[#FFFBEB]',
          textPrimary: 'text-[#92400E]',
          textSecondary: 'text-[#D97706]',
          hover: 'hover:bg-[#FEF3C7]',
          darkBorder: 'dark:border-[#78350F]',
          darkBg: 'dark:bg-[#1C1917]',
          darkTextPrimary: 'dark:text-[#FDE68A]',
          darkTextSecondary: 'dark:text-[#FBBF24]',
          darkHover: 'dark:hover:bg-[#292524]',
        };
      case 'limit':
        return {
          border: 'border-[#FECACA]',
          bg: 'bg-[#FEF2F2]',
          textPrimary: 'text-[#991B1B]',
          textSecondary: 'text-[#DC2626]',
          hover: 'hover:bg-[#FEE2E2]',
          darkBorder: 'dark:border-[#7F1D1D]',
          darkBg: 'dark:bg-[#1C0A0A]',
          darkTextPrimary: 'dark:text-[#FCA5A5]',
          darkTextSecondary: 'dark:text-[#F87171]',
          darkHover: 'dark:hover:bg-[#2A0A0A]',
        };
      default: // warning
        return {
          border: 'border-[#FED7AA]',
          bg: 'bg-[#FFFBEB]',
          textPrimary: 'text-[#9A3412]',
          textSecondary: 'text-[#EA580C]',
          hover: 'hover:bg-[#FEF3C7]',
          darkBorder: 'dark:border-[#7C2D12]',
          darkBg: 'dark:bg-[#1C1917]',
          darkTextPrimary: 'dark:text-[#FED7AA]',
          darkTextSecondary: 'dark:text-[#FB923C]',
          darkHover: 'dark:hover:bg-[#292524]',
        };
    }
  };

  const colors = getColors();

  return (
    <div className={cn("mx-auto flex items-center justify-center w-full", className)}>
      <AnimatePresence>
        <motion.div
          className="relative"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 30 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            initial="hidden"
            animate={isHovered ? "topLeft" : "hidden"}
            variants={iconVariants}
            className="pointer-events-none absolute left-[4px] top-[2px]"
          >
            <WarningIcon className={`w-4 h-4 ${colors.textSecondary} dark:${colors.darkTextSecondary}`} />
          </motion.div>
          <motion.div
            initial="hidden"
            animate={isHovered ? "bottomRight" : "hidden"}
            variants={iconVariants}
            className="pointer-events-none absolute bottom-[2px] right-[4px]"
          >
            <WarningIcon className={`w-4 h-4 ${colors.textSecondary} dark:${colors.darkTextSecondary}`} />
          </motion.div>
          <div className={cn(
            "relative flex h-[35px] items-center gap-1.5 rounded-[6px] border pl-3 pr-1 text-sm",
            colors.border, colors.bg,
            `dark:${colors.darkBorder} dark:${colors.darkBg}`
          )}>
            <AlertTriangle className={`w-4 h-4 shrink-0 ${colors.textSecondary} dark:${colors.darkTextSecondary}`} />
            <button
              className={cn(
                "font-medium underline decoration-[#FEF3C7] underline-offset-[3px] outline-none transition-colors",
                colors.textPrimary,
                `hover:${colors.textSecondary} dark:${colors.darkTextPrimary}`,
                `dark:hover:${colors.darkTextSecondary}`
              )}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onClick={onClick}
            >
              {buttonText}
            </button>
            <span className={cn("text-[0.8125rem]", colors.textSecondary, `dark:${colors.darkTextSecondary}`)}>
              {description}
            </span>
            {onClose && (
              <button
                onClick={onClose}
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] border-0 bg-transparent transition-colors",
                  colors.textSecondary, `hover:${colors.hover}`,
                  `dark:${colors.darkTextSecondary}`, `dark:${colors.darkHover}`
                )}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
