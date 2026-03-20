"use client";

import { useEffect } from "react";
import { WifiOff, CloudOff, CloudUpload } from "lucide-react";
import { useSyncStore } from "@/store";

export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingItems, setOnline, setSyncing } = useSyncStore();

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Set initial state
    setOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOnline]);

  // Don't show anything if online and no pending items
  if (isOnline && pendingItems === 0 && !isSyncing) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 lg:left-80 z-50">
      <div
        className={`
          mx-auto max-w-md rounded-lg px-4 py-3 shadow-lg flex items-center gap-3
          ${!isOnline ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"}
        `}
      >
        {!isOnline ? (
          <>
            <WifiOff className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">Modo Offline</p>
              <p className="text-xs opacity-90">
                Los datos se guardarán localmente
              </p>
            </div>
          </>
        ) : isSyncing ? (
          <>
            <CloudUpload className="w-5 h-5 flex-shrink-0 animate-pulse" />
            <div>
              <p className="font-medium text-sm">Sincronizando...</p>
              <p className="text-xs opacity-90">
                Subiendo datos pendientes
              </p>
            </div>
          </>
        ) : pendingItems > 0 ? (
          <>
            <CloudOff className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">
                {pendingItems} elemento{pendingItems !== 1 ? "s" : ""} pendiente{pendingItems !== 1 ? "s" : ""}
              </p>
              <p className="text-xs opacity-90">
                Esperando sincronización
              </p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
