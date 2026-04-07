import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon';
  className?: string;
  dark?: boolean;
}

const SIZES = {
  sm: { icon: 'w-7 h-7 rounded-lg', text: 'text-base', gap: 'gap-2' },
  md: { icon: 'w-9 h-9 rounded-xl', text: 'text-lg', gap: 'gap-2.5' },
  lg: { icon: 'w-11 h-11 rounded-xl', text: 'text-xl', gap: 'gap-3' },
  xl: { icon: 'w-14 h-14 rounded-2xl', text: 'text-2xl', gap: 'gap-3' },
};

export function Logo({ size = 'md', variant = 'full', className, dark = false }: LogoProps) {
  const s = SIZES[size];

  return (
    <div className={cn('flex items-center', s.gap, className)}>
      {/* Icon mark */}
      <div className={cn(
        'flex items-center justify-center flex-shrink-0 shadow-lg',
        'bg-gradient-to-br from-primary to-primary-dark',
        s.icon
      )}>
        <LogoMark className="w-[55%] h-[55%] text-white" />
      </div>

      {variant === 'full' && (
        <div className="flex items-baseline gap-0.5">
          <span className={cn('font-black tracking-tight leading-none', s.text, dark ? 'text-white' : 'text-gray-900')}>
            Factu
          </span>
          <span className={cn('font-black tracking-tight leading-none', s.text, 'text-primary')}>
            .me
          </span>
        </div>
      )}
    </div>
  );
}

/* Clean "F" monogram with a lightning bolt accent */
function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M6 4h10a1 1 0 0 1 0 2H8v4h7a1 1 0 0 1 0 2H8v7a1 1 0 0 1-2 0V5a1 1 0 0 1 1-1z"
        fill="currentColor"
      />
      <path
        d="M15.5 11.5l-3 5h2.5l-1.5 4 5.5-7h-3l2-2h-2.5z"
        fill="currentColor"
        opacity="0.7"
      />
    </svg>
  );
}

export default Logo;
