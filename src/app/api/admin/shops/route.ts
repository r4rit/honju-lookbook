import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  jsonError,
  parseJsonBody,
  unauthorizedResponse,
} from "@/lib/api-response";
import {
  createAdminShop,
  listAdminShops,
  StorageConflictError,
} from "@/lib/supabase/admin-queries";
import { createShopSchema, formatZodFieldErrors } from "@/lib/validators";

export const preferredRegion = "icn1";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdminSession())) {
    return unauthorizedResponse();
  }

  try {
    const shops = await listAdminShops();
    return NextResponse.json({ shops }, { status: 200 });
  } catch {
    return jsonError(
      500,
      "DB_QUERY_FAILED",
      "업체 목록을 불러오는 중 오류가 발생했습니다."
    );
  }
}

export async function POST(request: Request) {
  if (!(await requireAdminSession())) {
    return unauthorizedResponse();
  }

  const bodyResult = await parseJsonBody(request);
  if (!bodyResult.ok) {
    return bodyResult.response;
  }

  const validated = createShopSchema.safeParse(bodyResult.data);
  if (!validated.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "입력하신 업체 정보를 다시 확인해 주세요.",
      formatZodFieldErrors(validated.error)
    );
  }

  try {
    const shop = await createAdminShop(validated.data);
    revalidatePath("/");
    revalidatePath(`/shops/${shop.id}`);
    return NextResponse.json({ shop }, { status: 201 });
  } catch (error) {
    if (error instanceof StorageConflictError) {
      return jsonError(409, "IMAGE_CONFLICT", error.message);
    }

    return jsonError(
      500,
      "DB_MUTATION_FAILED",
      "업체 정보를 저장하는 중 오류가 발생했습니다."
    );
  }
}
