import type { Metadata } from "next";
import { AdminStudioShell } from "@/components/admin/AdminStudioShell";
import { requireAdminSession } from "@/lib/admin-auth";
import { listAdminShops } from "@/lib/supabase/admin-queries";
import type { AdminShopDetailDTO } from "@/types/shop";

export const preferredRegion = "icn1";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "관리자 스튜디오",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  const authenticated = await requireAdminSession();

  let initialShops: AdminShopDetailDTO[] = [];
  let initialLoadError: string | null = null;

  if (authenticated) {
    try {
      initialShops = await listAdminShops();
    } catch {
      initialLoadError =
        "업체 목록을 불러오지 못했습니다. Supabase 연결 설정을 확인해 주세요.";
    }
  }

  return (
    <AdminStudioShell
      initialAuthenticated={authenticated}
      initialShops={initialShops}
      initialLoadError={initialLoadError}
    />
  );
}
