'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  User, Settings, Bell, Smile, Moon, Zap, Gift,
  HelpCircle, ExternalLink, LogOut, ChevronDown,
} from "lucide-react";

export interface UserDropdownUser {
  name: string;
  username: string;
  avatar?: string;
  initials: string;
  status: "online" | "offline" | "busy";
}

export interface UserDropdownProps {
  user?: UserDropdownUser;
  onAction?: (action: string) => void;
  onStatusChange?: (status: string) => void;
  selectedStatus?: string;
}

const STATUS_LABELS: Record<string, string> = {
  online: "En ligne",
  offline: "Hors ligne",
  busy: "Occupé",
};

const STATUS_COLORS: Record<string, string> = {
  online: "bg-green-400",
  offline: "bg-gray-400",
  busy: "bg-red-400",
};

export const UserDropdown = ({
  user = { name: "Mon compte", username: "@factu.me", initials: "FC", status: "online" },
  onAction = () => {},
  onStatusChange = () => {},
  selectedStatus = "online",
}: UserDropdownProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="focus:outline-none relative group">
          <Avatar className="size-9 border-2 border-white/20 shadow-md transition-transform group-hover:scale-105">
            {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
            <AvatarFallback className="bg-primary text-white text-xs font-bold">
              {user.initials}
            </AvatarFallback>
          </Avatar>
          {/* Online indicator */}
          <span className={cn(
            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900",
            STATUS_COLORS[user.status]
          )} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-72 rounded-2xl bg-white border border-gray-100 p-0 shadow-2xl shadow-black/10"
        align="end"
        sideOffset={12}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-t-2xl border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="size-11 border-2 border-white shadow-sm">
                {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                <AvatarFallback className="bg-primary text-white text-sm font-bold">
                  {user.initials}
                </AvatarFallback>
              </Avatar>
              <span className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                STATUS_COLORS[user.status]
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.username}</p>
            </div>
            <span className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full",
              user.status === "online" ? "bg-green-100 text-green-700" :
              user.status === "busy" ? "bg-red-100 text-red-600" :
              "bg-gray-100 text-gray-500"
            )}>
              {STATUS_LABELS[user.status]}
            </span>
          </div>
        </div>

        {/* Status submenu */}
        <div className="p-1.5">
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-600 cursor-pointer hover:bg-gray-50">
                <Smile size={15} className="text-gray-400" />
                <span className="font-medium">Changer le statut</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="bg-white border border-gray-100 rounded-xl shadow-xl p-1.5">
                  <DropdownMenuRadioGroup value={selectedStatus} onValueChange={onStatusChange}>
                    <DropdownMenuRadioItem className="gap-2 text-sm rounded-lg" value="online">
                      <span className="w-2 h-2 rounded-full bg-green-400" />
                      En ligne
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem className="gap-2 text-sm rounded-lg" value="offline">
                      <Moon size={14} className="text-gray-400" />
                      Apparaître hors ligne
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuGroup>

          <DropdownMenuSeparator className="my-1.5 bg-gray-100" />

          <DropdownMenuGroup>
            <DropdownMenuItem className="gap-2.5 px-3 py-2 rounded-xl cursor-pointer" onClick={() => onAction('profile')}>
              <User size={15} className="text-gray-400" />
              <span className="text-sm font-medium">Mon profil</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2.5 px-3 py-2 rounded-xl cursor-pointer" onClick={() => onAction('settings')}>
              <Settings size={15} className="text-gray-400" />
              <span className="text-sm font-medium">Paramètres</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2.5 px-3 py-2 rounded-xl cursor-pointer" onClick={() => onAction('notifications')}>
              <Bell size={15} className="text-gray-400" />
              <span className="text-sm font-medium">Notifications</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator className="my-1.5 bg-gray-100" />

          {/* Upgrade */}
          <DropdownMenuGroup>
            <DropdownMenuItem
              className="gap-2.5 px-3 py-2 rounded-xl cursor-pointer bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100"
              onClick={() => onAction('upgrade')}
            >
              <Zap size={15} className="text-amber-500" />
              <span className="text-sm font-semibold text-amber-700 flex-1">Passer à Pro</span>
              <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-bold">PRO</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator className="my-1.5 bg-gray-100" />

          <DropdownMenuGroup>
            <DropdownMenuItem className="gap-2.5 px-3 py-2 rounded-xl cursor-pointer" onClick={() => onAction('help')}>
              <HelpCircle size={15} className="text-gray-400" />
              <span className="text-sm font-medium flex-1">Aide</span>
              <ExternalLink size={12} className="text-gray-300" />
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator className="my-1.5 bg-gray-100" />

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
