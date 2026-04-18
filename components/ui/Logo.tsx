import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon';
  className?: string;
  dark?: boolean;
}

const SIZES = {
  sm: { icon: 'w-7 h-7 rounded-lg', text: 'text-base', gap: 'gap-2', px: 28 },
  md: { icon: 'w-9 h-9 rounded-xl', text: 'text-lg', gap: 'gap-2.5', px: 36 },
  lg: { icon: 'w-11 h-11 rounded-xl', text: 'text-xl', gap: 'gap-3', px: 44 },
  xl: { icon: 'w-14 h-14 rounded-2xl', text: 'text-2xl', gap: 'gap-3', px: 56 },
};

export function Logo({ size = 'md', variant = 'full', className, dark = false }: LogoProps) {
  const s = SIZES[size];

  return (
    <div className={cn('flex items-center', s.gap, className)}>
      {/* Icon mark — uses company logo */}
      <div className={cn(
        'flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden',
        s.icon
      )}>
        <Image
          src="/icons/icon.svg"
          alt="Factu.me"
          width={s.px}
          height={s.px}
          className="w-full h-full object-cover"
        />
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

export default Logo;
