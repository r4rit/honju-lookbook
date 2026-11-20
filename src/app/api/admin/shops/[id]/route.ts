import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  jsonError,
  parseJsonBody,
  unauthorizedResponse,
} from "@/lib/api-response";
import {
  deleteAdminShop,
  StorageConflictError,
  updateAdminShop,
} from "@/lib/supabase/admin-queries";
import {
  formatZodFieldErrors,
  updateShopSchema,
  uuidSchema,
} from "@/lib/validators";

export const preferredRegion = "icn1";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;
  const idValidation = uuidSchema.safeParse(id);
  if (!idValidation.success) {
    return jsonError(400, "INVALID_ID", "올바른 업체 식별자가 아닙니다.");
  }

  const bodyResult = await parseJsonBody(request);
  if (!bodyResult.ok) {
    return bodyResult.response;
  }

  const validated = updateShopSchema.safeParse(bodyResult.data);
  if (!validated.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "수정할 업체 정보를 다시 확인해 주세요.",
      formatZodFieldErrors(validated.error)
    );
  }

  try {
    const shop = await updateAdminShop(idValidation.data, validated.data);
    if (!shop) {
      return jsonError(404, "NOT_FOUND", "해당 업체를 찾을 수 없습니다.");
    }

    revalidatePath("/");
    revalidatePath(`/shops/${shop.id}`);
    return NextResponse.json({ shop }, { status: 200 });
  } catch (error) {
    if (error instanceof StorageConflictError) {
      return jsonError(409, "IMAGE_CONFLICT", error.message);
    }

    return jsonError(
      500,
      "DB_MUTATION_FAILED",
      "업체 정보를 수정하는 중 오류가 발생했습니다."
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;
  const idValidation = uuidSchema.safeParse(id);
  if (!idValidation.success) {
    return jsonError(400, "INVALID_ID", "올바른 업체 식별자가 아닙니다.");
  }

  try {
    const deleted = await deleteAdminShop(idValidation.data);
    if (!deleted) {
      return jsonError(404, "NOT_FOUND", "삭제할 업체를 찾을 수 없습니다.");
    }

    revalidatePath("/");
    revalidatePath(`/shops/${idValidation.data}`);
    return NextResponse.json(
      { deleted: true, id: idValidation.data },
      { status: 200 }
    );
  } catch {
    return jsonError(
      500,
      "DB_MUTATION_FAILED",
      "업체를 삭제하는 중 오류가 발생했습니다."
    );
  }
}
