"use client";

import { Menu, Wifi, WifiOff, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSyncStore } from "@/store";

interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
}

export function Header({ onMenuClick, title }: HeaderProps) {
  const { isOnline, pendingItems } = useSyncStore();

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 lg:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Title */}
      <h1 className="text-lg font-semibold text-gray-900">
        {title || "Dashboard"}
      </h1>

      <div className="flex-1" />

      {/* Status indicators */}
      <div className="flex items-center gap-3">
        {/* Connection status */}
        <div className="flex items-center gap-1.5">
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-emerald-600 font-medium hidden sm:inline">
                Online
              </span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-amber-600 font-medium hidden sm:inline">
                Offline
              </span>
            </>
          )}
        </div>

        {/* Pending sync */}
        {pendingItems > 0 && (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            {pendingItems} pendiente{pendingItems !== 1 ? "s" : ""}
          </Badge>
        )}

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-gray-500" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </Button>
      </div>
    </header>
  );
}
