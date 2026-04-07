'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/Badge";
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
import { Icon } from "@iconify/react";

const MENU_ITEMS = {
  status: [
    { value: "focus", icon: "solar:emoji-funny-circle-line-duotone", label: "Focus" },
    { value: "offline", icon: "solar:moon-sleep-line-duotone", label: "Apparaître hors ligne" },
  ],
  profile: [
    { icon: "solar:user-circle-line-duotone", label: "Mon profil", action: "profile" },
    { icon: "solar:settings-line-duotone", label: "Paramètres", action: "settings" },
    { icon: "solar:bell-line-duotone", label: "Notifications", action: "notifications" },
  ],
  premium: [
    {
      icon: "solar:star-bold",
      label: "Passer à Pro",
      action: "upgrade",
      iconClass: "text-amber-500",
      badge: { text: "–50%", className: "bg-amber-500 text-white text-[10px] px-1.5 py-0 rounded-full font-bold" },
    },
  ],
  support: [
    { icon: "solar:question-circle-line-duotone", label: "Aide", action: "help", rightIcon: "solar:square-top-down-line-duotone" },
  ],
  account: [
    { icon: "solar:logout-2-bold-duotone", label: "Se déconnecter", action: "logout" },
  ],
};

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

export const UserDropdown = ({
  user = {
    name: "Mon compte",
    username: "@factu.me",
    initials: "FC",
    status: "online",
  },
  onAction = () => {},
  onStatusChange = () => {},
  selectedStatus = "online",
}: UserDropdownProps) => {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      online: "bg-green-100 text-green-700 border-green-300",
      offline: "bg-gray-100 text-gray-500 border-gray-300",
      busy: "bg-red-100 text-red-600 border-red-300",
    };
    return colors[status.toLowerCase()] || colors.online;
  };

  const renderMenuItem = (item: any, index: number) => (
    <DropdownMenuItem
      key={index}
      className={cn(
        "p-2 rounded-lg cursor-pointer",
        item.badge || item.rightIcon ? "justify-between" : "",
      )}
      onClick={() => onAction(item.action)}
    >
      <span className="flex items-center gap-1.5 font-medium text-sm">
        <Icon
          icon={item.icon}
          className={`size-4 ${item.iconClass || "text-gray-500"}`}
        />
        {item.label}
      </span>
      {item.badge && (
        <span className={item.badge.className}>{item.badge.text}</span>
      )}
      {item.rightIcon && (
        <Icon icon={item.rightIcon} className="size-3.5 text-gray-400" />
      )}
    </DropdownMenuItem>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="focus:outline-none">
          <Avatar className="cursor-pointer size-9 border-2 border-white shadow-sm hover:ring-2 hover:ring-primary/30 transition-all">
            {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
            <AvatarFallback className="bg-primary text-white text-xs font-bold">
              {user.initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-[280px] rounded-2xl bg-gray-50 border border-gray-200 p-0 shadow-xl"
        align="end"
        sideOffset={8}
      >
        {/* User header */}
        <section className="bg-white rounded-2xl p-1 shadow-sm border border-gray-100 m-1">
          <div className="flex items-center p-2 gap-3">
            <Avatar className="size-10 border border-gray-200">
              {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
              <AvatarFallback className="bg-primary text-white text-xs font-bold">
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-gray-900 truncate">{user.name}</h3>
              <p className="text-xs text-gray-500 truncate">{user.username}</p>
            </div>
            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", getStatusColor(user.status))}>
              {user.status === "online" ? "En ligne" : user.status === "busy" ? "Occupé" : "Hors ligne"}
            </span>
          </div>

          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer p-2 rounded-lg text-sm text-gray-500">
                <Icon icon="solar:smile-circle-line-duotone" className="size-4 mr-1.5 text-gray-400" />
                Changer le statut
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="bg-white border border-gray-200 rounded-xl shadow-lg">
                  <DropdownMenuRadioGroup value={selectedStatus} onValueChange={onStatusChange}>
                    {MENU_ITEMS.status.map((s, i) => (
                      <DropdownMenuRadioItem className="gap-2 text-sm" key={i} value={s.value}>
                        <Icon icon={s.icon} className="size-4 text-gray-500" />
                        {s.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuGroup>

          <DropdownMenuSeparator className="bg-gray-100" />
          <DropdownMenuGroup>{MENU_ITEMS.profile.map(renderMenuItem)}</DropdownMenuGroup>
          <DropdownMenuSeparator className="bg-gray-100" />
          <DropdownMenuGroup>{MENU_ITEMS.premium.map(renderMenuItem)}</DropdownMenuGroup>
          <DropdownMenuSeparator className="bg-gray-100" />
          <DropdownMenuGroup>{MENU_ITEMS.support.map(renderMenuItem)}</DropdownMenuGroup>
        </section>

        {/* Logout */}
        <section className="p-1">
          <DropdownMenuGroup>
            {MENU_ITEMS.account.map(renderMenuItem)}
          </DropdownMenuGroup>
        </section>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserDropdown;
