'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  User, Settings, Bell, Moon, Wifi, HelpCircle,
  LogOut, ArrowLeftRight, UserCircle2, Plus, Crown,
} from 'lucide-react';
import { useEffect, useState } from 'react';

export interface UserDropdownUser {
  name: string;
  email: string;
  initials: string;
  avatar?: string;   // profile logo_url
  status: 'online' | 'offline' | 'busy';
  tier?: string;
}

export interface UserDropdownProps {
  user?: UserDropdownUser;
  onAction?: (action: string) => void;
  onStatusChange?: (status: string) => void;
  selectedStatus?: string;
}

const STATUS_LABELS: Record<string, string> = {
  online: 'En ligne',
  offline: 'Hors ligne',
  busy: 'Occupé',
};

const STATUS_COLORS: Record<string, string> = {
  online: 'bg-green-400',
  offline: 'bg-gray-400',
  busy: 'bg-amber-400',
};

const TIER_LABELS: Record<string, string> = {
  free: 'Plan Gratuit',
  solo: 'Plan Solo',
  pro: 'Plan Pro',
  business: 'Plan Business',
};

interface SavedAccount {
  email: string;
  name: string;
  initials: string;
  lastUsed: string;
}

function getSavedAccounts(): SavedAccount[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('savedAccounts') || '[]'); }
  catch { return []; }
}

export function saveCurrentAccount(email: string, name: string, initials: string) {
  if (typeof window === 'undefined') return;
  try {
    const accounts = getSavedAccounts();
    const filtered = accounts.filter((a) => a.email !== email);
    const updated: SavedAccount[] = [
      { email, name, initials, lastUsed: new Date().toISOString() },
      ...filtered,
    ].slice(0, 5);
    localStorage.setItem('savedAccounts', JSON.stringify(updated));
  } catch { }
}

export const UserDropdown = ({
  user = { name: 'Mon compte', email: 'compte@factu.me', initials: 'FC', status: 'online' },
  onAction = () => { },
  onStatusChange = () => { },
  selectedStatus = 'online',
}: UserDropdownProps) => {
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);

  useEffect(() => {
    setSavedAccounts(getSavedAccounts().filter((a) => a.email !== user.email));
  }, [user.email]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative focus:outline-none group">
          <Avatar className="size-9 border-2 border-white/20 shadow-md transition-transform group-hover:scale-105">
            {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
            <AvatarFallback className="bg-primary text-white text-xs font-bold">
              {user.initials}
            </AvatarFallback>
          </Avatar>
          <span className={cn(
            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900',
            STATUS_COLORS[user.status],
          )} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-72 rounded-2xl bg-white border border-gray-100 p-0 shadow-2xl shadow-black/10"
        align="end"
        sideOffset={12}
      >
        {/* ── Header with avatar ── */}
        <div className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-t-2xl border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="size-12 border-2 border-white shadow-sm">
                {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                <AvatarFallback className="bg-primary text-white font-bold">
                  {user.initials}
                </AvatarFallback>
              </Avatar>
              <span className={cn(
                'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white',
                STATUS_COLORS[user.status],
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900 truncate leading-tight">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
              {user.tier && (
                <div className="flex items-center gap-1 mt-1">
                  <Crown size={9} className={user.tier === 'free' ? 'text-gray-400' : 'text-amber-500'} />
                  <span className="text-[10px] text-gray-500 font-medium">
                    {TIER_LABELS[user.tier] ?? user.tier}
                  </span>
                </div>
              )}
            </div>
            <span className={cn(
              'text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0',
              user.status === 'online' ? 'bg-green-100 text-green-700' :
                user.status === 'busy' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-500',
            )}>
              {STATUS_LABELS[user.status]}
            </span>
          </div>
        </div>

        <div className="p-1.5">
          {/* ── Main actions ── */}
          <DropdownMenuGroup>
            <DropdownMenuItem
              className="gap-2.5 px-3 py-2 rounded-xl cursor-pointer"
              onClick={() => onAction('profile')}
            >
              <User size={15} className="text-gray-400" />
              <span className="text-sm font-medium">Mon profil</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2.5 px-3 py-2 rounded-xl cursor-pointer"
              onClick={() => onAction('settings')}
            >
              <Settings size={15} className="text-gray-400" />
              <span className="text-sm font-medium">Paramètres</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2.5 px-3 py-2 rounded-xl cursor-pointer"
              onClick={() => onAction('notifications')}
            >
              <Bell size={15} className="text-gray-400" />
              <span className="text-sm font-medium">Notifications</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2.5 px-3 py-2 rounded-xl cursor-pointer"
              onClick={() => onAction('help')}
            >
              <HelpCircle size={15} className="text-gray-400" />
              <span className="text-sm font-medium">Aide</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator className="my-1.5 bg-gray-100" />

          {/* ── Switch account ── */}
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 cursor-pointer">
                <ArrowLeftRight size={15} className="text-gray-400" />
                <span>Changer de compte</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="bg-white border border-gray-100 rounded-xl shadow-xl p-1.5 min-w-[230px]">
                  {savedAccounts.length > 0 && (
                    <>
                      <p className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Comptes récents
                      </p>
                      {savedAccounts.map((acc) => (
                        <DropdownMenuItem
                          key={acc.email}
                          className="gap-2.5 px-3 py-2 rounded-xl cursor-pointer"
                          onClick={() => onAction(`switch:${acc.email}`)}
                        >
                          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-primary">{acc.initials}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{acc.name}</p>
                            <p className="text-xs text-gray-400 truncate">{acc.email}</p>
                          </div>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator className="my-1 bg-gray-100" />
                    </>
                  )}
                  <DropdownMenuItem
                    className="gap-2.5 px-3 py-2 rounded-xl cursor-pointer"
                    onClick={() => onAction('add-account')}
                  >
                    <div className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
                      <Plus size={12} className="text-gray-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Ajouter un compte</span>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuGroup>

          <DropdownMenuSeparator className="my-1.5 bg-gray-100" />

          {/* ── Sign out ── */}
          <DropdownMenuGroup>
            <DropdownMenuItem
              className="gap-2.5 px-3 py-2 rounded-xl cursor-pointer text-red-500 hover:bg-red-50 hover:text-red-600"
              onClick={() => onAction('logout')}
            >
              <LogOut size={15} />
              <span className="text-sm font-medium">Se déconnecter</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserDropdown;
