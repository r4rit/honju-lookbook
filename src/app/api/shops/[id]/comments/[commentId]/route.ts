import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { jsonError } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabase/server";
import { familyRoleSchema, uuidSchema } from "@/lib/validators";
import type { FamilyRole } from "@/types/shop";

export const preferredRegion = "icn1";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; commentId: string }> }
) {
  const { id, commentId } = await context.params;

  const shopIdCheck = uuidSchema.safeParse(id);
  const commentIdCheck = uuidSchema.safeParse(commentId);
  if (!shopIdCheck.success || !commentIdCheck.success) {
    return jsonError(400, "INVALID_ID", "올바른 식별자 형식이 아닙니다.");
  }

  const shopId = shopIdCheck.data;
  const targetCommentId = commentIdCheck.data;

  const isAdmin = await requireAdminSession();
  const { searchParams } = new URL(request.url);
  const rawRole = searchParams.get("family_role");

  let callerRole: FamilyRole | null = null;
  if (!isAdmin) {
    const roleValidation = familyRoleSchema.safeParse(rawRole);
    if (!roleValidation.success) {
      return jsonError(
        403,
        "FORBIDDEN",
        "본인이 작성한 의견만 삭제할 수 있어요."
      );
    }
    callerRole = roleValidation.data;
  }

  try {
    const admin = supabaseAdmin();

    const { data: commentRow, error: lookupError } = await admin
      .from("shop_comments")
      .select("id, family_role")
      .eq("id", targetCommentId)
      .eq("shop_id", shopId)
      .maybeSingle();

    if (lookupError) {
      return jsonError(
        500,
        "DB_QUERY_FAILED",
        "의견 정보를 확인하는 중 오류가 발생했습니다."
      );
    }
    if (!commentRow) {
      return jsonError(404, "NOT_FOUND", "삭제할 의견을 찾을 수 없습니다.");
    }

    const row = commentRow as { id: string; family_role: FamilyRole };
    if (!isAdmin && row.family_role !== callerRole) {
      return jsonError(
        403,
        "FORBIDDEN",
        "본인이 작성한 의견만 삭제할 수 있어요."
      );
    }

    const { error: deleteError } = await admin
      .from("shop_comments")
      .delete()
      .eq("id", targetCommentId)
      .eq("shop_id", shopId);

    if (deleteError) {
      return jsonError(
        500,
        "DB_MUTATION_FAILED",
        "의견을 삭제하지 못했습니다."
      );
    }

    revalidatePath("/");
    revalidatePath(`/shops/${shopId}`);

    return NextResponse.json(
      { deleted: true, id: targetCommentId },
      { status: 200 }
    );
  } catch {
    return jsonError(
      500,
      "DB_MUTATION_FAILED",
      "의견 삭제 중 오류가 발생했습니다."
    );
  }
}
