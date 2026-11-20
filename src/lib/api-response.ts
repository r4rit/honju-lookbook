import "server-only";

import { NextResponse } from "next/server";
import type { ApiErrorResponse } from "@/types/shop";

export function jsonError(
  status: number,
  code: string,
  message: string,
  details?: Record<string, string[]>,
  headers?: HeadersInit
): NextResponse<ApiErrorResponse> {
  const payload: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(details && Object.keys(details).length > 0 ? { details } : {}),
    },
  };

  return NextResponse.json(payload, { status, headers });
}

export function unauthorizedResponse(): NextResponse<ApiErrorResponse> {
  return jsonError(401, "UNAUTHORIZED", "관리자 인증이 필요합니다.");
}

export async function parseJsonBody(
  request: Request
): Promise<
  | { ok: true; data: unknown }
  | { ok: false; response: NextResponse<ApiErrorResponse> }
> {
  try {
    const data: unknown = await request.json();
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      response: jsonError(400, "INVALID_JSON", "올바른 JSON 요청 형식이 아닙니다."),
    };
  }
}
