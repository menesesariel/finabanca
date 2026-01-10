"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff, Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface SyncStatusProps {
  enabled: boolean;
  onToggle: () => void;
}

export function SyncStatus({ enabled, onToggle }: SyncStatusProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  const requestNotifications = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === "granted");
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Auto-sync toggle */}
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all",
          enabled
            ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
            : "bg-dark-700 text-dark-400 hover:bg-dark-600"
        )}
        title={enabled ? "Auto-sync activo" : "Auto-sync desactivado"}
      >
        {enabled ? (
          <>
            <Wifi className="w-3 h-3" />
            <span className="hidden sm:inline">Auto</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3" />
            <span className="hidden sm:inline">Manual</span>
          </>
        )}
      </button>

      {/* Notifications toggle */}
      <button
        onClick={requestNotifications}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all",
          notificationsEnabled
            ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
            : "bg-dark-700 text-dark-400 hover:bg-dark-600"
        )}
        title={notificationsEnabled ? "Notificaciones activas" : "Activar notificaciones"}
      >
        {notificationsEnabled ? (
          <Bell className="w-3 h-3" />
        ) : (
          <BellOff className="w-3 h-3" />
        )}
      </button>
    </div>
  );
}

