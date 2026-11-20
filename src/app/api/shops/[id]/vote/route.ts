import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { jsonError, parseJsonBody } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  formatZodFieldErrors,
  uuidSchema,
  voteRequestSchema,
} from "@/lib/validators";
import type { FamilyRole } from "@/types/shop";

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

  const validated = voteRequestSchema.safeParse(bodyResult.data);
  if (!validated.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "가족 역할을 확인해 주세요.",
      formatZodFieldErrors(validated.error)
    );
  }

  const shopId = idValidation.data;
  const familyRole = validated.data.family_role;

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

    const { data: existingVote, error: existingVoteError } = await admin
      .from("shop_votes")
      .select("id")
      .eq("shop_id", shopId)
      .eq("family_role", familyRole)
      .maybeSingle();

    if (existingVoteError) {
      return jsonError(
        500,
        "DB_QUERY_FAILED",
        "찜 상태를 확인하는 중 오류가 발생했습니다."
      );
    }

    let voted = false;

    if (existingVote) {
      const { error: deleteError } = await admin
        .from("shop_votes")
        .delete()
        .eq("id", (existingVote as { id: string }).id);

      if (deleteError) {
        return jsonError(
          500,
          "DB_MUTATION_FAILED",
          "찜 취소에 실패했습니다. 잠시 후 다시 시도해 주세요."
        );
      }
      voted = false;
    } else {
      const { error: insertError } = await admin
        .from("shop_votes")
        .insert({ shop_id: shopId, family_role: familyRole });

      if (insertError) {
        // Treat concurrent duplicate-insert race cleanly as already voted
        if (insertError.code === "23505") {
          voted = true;
        } else {
          return jsonError(
            500,
            "DB_MUTATION_FAILED",
            "마음에 들어요 저장에 실패했습니다."
          );
        }
      } else {
        voted = true;
      }
    }

    const { data: votesData, error: votesError } = await admin
      .from("shop_votes")
      .select("family_role")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: true });

    if (votesError) {
      return jsonError(
        500,
        "DB_QUERY_FAILED",
        "업데이트된 찜 목록을 불러오지 못했습니다."
      );
    }

    const voters = ((votesData ?? []) as Array<{ family_role: FamilyRole }>).map(
      (v) => v.family_role
    );

    revalidatePath("/");
    revalidatePath(`/shops/${shopId}`);

    return NextResponse.json(
      {
        shop_id: shopId,
        family_role: familyRole,
        voted,
        vote_count: voters.length,
        voters,
      },
      { status: 200 }
    );
  } catch {
    return jsonError(
      500,
      "DB_MUTATION_FAILED",
      "마음에 들어요 처리 중 오류가 발생했습니다."
    );
  }
}
