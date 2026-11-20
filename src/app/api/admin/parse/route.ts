import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  jsonError,
  parseJsonBody,
  unauthorizedResponse,
} from "@/lib/api-response";
import { parseShopRawText } from "@/lib/gemini";
import { formatZodFieldErrors, parseRawTextSchema } from "@/lib/validators";

export const preferredRegion = "icn1";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await requireAdminSession())) {
    return unauthorizedResponse();
  }

  const bodyResult = await parseJsonBody(request);
  if (!bodyResult.ok) {
    return bodyResult.response;
  }

  const validated = parseRawTextSchema.safeParse(bodyResult.data);
  if (!validated.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "정리할 텍스트를 확인해 주세요.",
      formatZodFieldErrors(validated.error)
    );
  }

  try {
    const parsed = await parseShopRawText(validated.data.raw_text);
    return NextResponse.json({ parsed }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("GEMINI_API_KEY")) {
      return jsonError(
        500,
        "SERVER_CONFIG_ERROR",
        "GEMINI_API_KEY 환경 변수가 설정되지 않았습니다."
      );
    }

    console.error("[api/admin/parse] Gemini parse failed:", message || error);

    return jsonError(
      502,
      "AI_PARSE_FAILED",
      "AI 자동 정리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
    );
  }
}
