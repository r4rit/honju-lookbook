import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { jsonError, parseJsonBody } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  createCommentSchema,
  formatZodFieldErrors,
  uuidSchema,
} from "@/lib/validators";
import type { ShopCommentDTO } from "@/types/shop";

export const preferredRegion = "icn1";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const idValidation = uuidSchema.safeParse(id);
  if (!idValidation.success) {
    return jsonError(400, "INVALID_ID", "올바른 업체 식별자가 아닙니다.");
  }

  const bodyResult = await parseJsonBody(request);
  if (!bodyResult.ok) {
    return bodyResult.response;
  }

  const validated = createCommentSchema.safeParse(bodyResult.data);
  if (!validated.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "입력하신 의견 내용을 확인해 주세요.",
      formatZodFieldErrors(validated.error)
    );
  }

  const shopId = idValidation.data;

  try {
    const admin = supabaseAdmin();

    const { data: shopData, error: shopError } = await admin
      .from("shops")
      .select("id")
      .eq("id", shopId)
      .in("status", ["candidate", "finalist"])
      .maybeSingle();

    if (shopError) {
      return jsonError(500, "DB_QUERY_FAILED", "업체 확인 중 오류가 발생했습니다.");
    }
    if (!shopData) {
      return jsonError(404, "NOT_FOUND", "해당 업체를 찾을 수 없습니다.");
    }

    const { data: insertedComment, error: insertError } = await admin
      .from("shop_comments")
      .insert({
        shop_id: shopId,
        family_role: validated.data.family_role,
        content: validated.data.content,
      })
      .select("id, shop_id, family_role, content, created_at")
      .single();

    if (insertError || !insertedComment) {
      return jsonError(
        500,
        "DB_MUTATION_FAILED",
        "의견을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요."
      );
    }

    revalidatePath("/");
    revalidatePath(`/shops/${shopId}`);

    return NextResponse.json(
      { comment: insertedComment as ShopCommentDTO },
      { status: 201 }
    );
  } catch {
    return jsonError(
      500,
      "DB_MUTATION_FAILED",
      "의견 저장 중 오류가 발생했습니다."
    );
  }
}
