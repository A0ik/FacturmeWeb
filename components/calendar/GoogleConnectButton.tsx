'use client';

import { motion } from 'framer-motion';
import { Loader2, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { glassTokens } from './constants';

interface GoogleConnectButtonProps {
  className?: string;
}

// Google "G" SVG icon
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export function GoogleConnectButton({ className }: GoogleConnectButtonProps) {
  const { connected, loading, googleInfo, connect, disconnect } = useGoogleCalendar();

  if (loading) {
    return (
      <div className={cn(
        'flex items-center gap-2 px-4 py-2.5 rounded-xl',
        'bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm',
        'border border-white/20 dark:border-white/10',
        glassTokens.btnSecondary,
        className
      )}>
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-600 dark:text-gray-400">Chargement...</span>
      </div>
    );
  }

  if (connected && googleInfo) {
    return (
      <div className="flex items-center gap-2">
        {/* Connected avatar with email */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border border-white/30 dark:border-white/10">
          {googleInfo.picture ? (
            <img
              src={googleInfo.picture}
              alt={googleInfo.name}
              className="w-7 h-7 rounded-full border-2 border-white/30"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {googleInfo.email?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
            {googleInfo.email || 'Compte Google'}
          </div>
          {/* Simple green dot without animation */}
          <div className="w-2 h-2 rounded-full bg-green-500" />
        </div>

        {/* Disconnect button - always visible */}
        <motion.button
          onClick={() => {
            if (confirm('Déconnecter Google Calendar ?')) {
              disconnect();
            }
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-xl min-h-[36px] text-sm font-medium',
            'bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm',
            'border border-red-200/50 dark:border-red-800/30',
            'text-red-600 dark:text-red-400',
            'hover:bg-red-100/80 dark:hover:bg-red-900/30',
            'transition-all duration-200 cursor-pointer'
          )}
          title="Déconnecter Google Calendar"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Déconnecter</span>
        </motion.button>
      </div>
    );
  }

  return (
    <motion.button
      onClick={connect}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 rounded-xl min-h-[44px]',
        'bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl',
        'border border-white/30 dark:border-white/10 shadow-lg',
        'hover:bg-white/80 dark:hover:bg-slate-800/80 hover:shadow-xl',
        'transition-all duration-300 cursor-pointer',
        className
      )}
    >
      <GoogleIcon className="w-5 h-5" />
      <span className="text-sm font-medium text-gray-900 dark:text-white">
        Connecter Google Calendar
      </span>
    </motion.button>
  );
}
