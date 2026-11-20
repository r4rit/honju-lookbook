import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-response";
import { listPublicShops } from "@/lib/supabase/queries";
import { publicListFilterSchema } from "@/lib/validators";

export const preferredRegion = "icn1";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawFilter = searchParams.get("filter") ?? undefined;

  const validatedFilter = publicListFilterSchema.safeParse(rawFilter);
  if (!validatedFilter.success) {
    return jsonError(400, "INVALID_FILTER", "올바른 분류 조건이 아닙니다.");
  }

  try {
    const shops = await listPublicShops(validatedFilter.data);
    return NextResponse.json(
      { shops, total: shops.length },
      { status: 200 }
    );
  } catch {
    return jsonError(
      500,
      "DB_QUERY_FAILED",
      "업체 목록을 불러오는 중 오류가 발생했습니다."
    );
  }
}
