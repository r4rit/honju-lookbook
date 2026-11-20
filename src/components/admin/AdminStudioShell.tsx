"use client";

import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { AdminPinGate } from "@/components/admin/AdminPinGate";
import { AdminWorkbench } from "@/components/admin/AdminWorkbench";
import type { AdminShopDetailDTO } from "@/types/shop";

interface AdminStudioShellProps {
  initialAuthenticated: boolean;
  initialShops: AdminShopDetailDTO[];
  initialLoadError: string | null;
}

export function AdminStudioShell({
  initialAuthenticated,
  initialShops,
  initialLoadError,
}: AdminStudioShellProps) {
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [shops, setShops] = useState<AdminShopDetailDTO[]>(initialShops);
  const [loadError, setLoadError] = useState<string | null>(initialLoadError);
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [isLoadingShops, setIsLoadingShops] = useState(false);

  const handleAuthenticated = useCallback(async () => {
    setGateMessage(null);
    setAuthenticated(true);
    setIsLoadingShops(true);
    setLoadError(null);

    try {
      const res = await fetch("/api/admin/shops", { cache: "no-store" });
      if (res.status === 401) {
        setAuthenticated(false);
        setGateMessage("인증에 실패했습니다. 다시 입력해 주세요.");
        return;
      }

      const data = (await res.json().catch(() => null)) as {
        shops?: AdminShopDetailDTO[];
        error?: { message?: string };
      } | null;

      if (!res.ok || !data?.shops) {
        setLoadError(
          data?.error?.message ?? "업체 목록을 불러오지 못했습니다."
        );
        return;
      }

      setShops(data.shops);
    } catch {
      setLoadError("업체 목록을 불러오는 중 네트워크 오류가 발생했습니다.");
    } finally {
      setIsLoadingShops(false);
    }
  }, []);

  const handleLoggedOut = useCallback((message?: string) => {
    setAuthenticated(false);
    setShops([]);
    setLoadError(null);
    setGateMessage(message ?? null);
  }, []);

  if (!authenticated) {
    return (
      <AdminPinGate
        onAuthenticated={handleAuthenticated}
        initialMessage={gateMessage}
      />
    );
  }

  if (isLoadingShops) {
    return (
      <div className="min-h-[100dvh] bg-canvas-mobile md:bg-canvas-desktop flex flex-col items-center justify-center gap-3 px-4">
        <Loader2
          className="w-8 h-8 text-accent-gold-text animate-spin"
          aria-hidden="true"
        />
        <p className="text-body text-text-secondary">
          업체 목록을 불러오는 중이에요...
        </p>
      </div>
    );
  }

  return (
    <AdminWorkbench
      initialShops={shops}
      initialError={loadError}
      onLoggedOut={handleLoggedOut}
    />
  );
}
