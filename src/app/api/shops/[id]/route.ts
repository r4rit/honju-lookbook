import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-response";
import { getPublicShopById } from "@/lib/supabase/queries";
import { uuidSchema } from "@/lib/validators";

export const preferredRegion = "icn1";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const idValidation = uuidSchema.safeParse(id);
  if (!idValidation.success) {
    return jsonError(400, "INVALID_ID", "올바른 업체 식별자가 아닙니다.");
  }

  try {
    const shop = await getPublicShopById(idValidation.data);
    if (!shop) {
      return jsonError(404, "NOT_FOUND", "해당 업체를 찾을 수 없습니다.");
    }

    return NextResponse.json({ shop }, { status: 200 });
  } catch {
    return jsonError(
      500,
      "DB_QUERY_FAILED",
      "업체 정보를 불러오는 중 오류가 발생했습니다."
    );
  }
}
