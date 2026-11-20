import { NextResponse } from "next/server";
import {
  attachAdminSessionCookie,
  checkPinRateLimit,
  clearAdminSessionCookie,
  clearPinAttempts,
  getClientIp,
  recordFailedPinAttempt,
  requireAdminSession,
  verifyAdminPin,
  waitFailedAuthDelay,
} from "@/lib/admin-auth";
import { jsonError, parseJsonBody } from "@/lib/api-response";
import { adminPinSchema, formatZodFieldErrors } from "@/lib/validators";

export const preferredRegion = "icn1";
export const dynamic = "force-dynamic";

export async function GET() {
  const authenticated = await requireAdminSession();
  return NextResponse.json({ authenticated }, { status: 200 });
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = checkPinRateLimit(ip);
  if (rateLimit.limited) {
    return jsonError(
      429,
      "RATE_LIMITED",
      "비밀번호 입력 시도가 너무 많습니다. 15분 뒤에 다시 시도해 주세요.",
      undefined,
      { "Retry-After": String(rateLimit.retryAfterSec) }
    );
  }

  const bodyResult = await parseJsonBody(request);
  if (!bodyResult.ok) {
    return bodyResult.response;
  }

  const parsed = adminPinSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "4자리 숫자 비밀번호를 입력해 주세요.",
      formatZodFieldErrors(parsed.error)
    );
  }

  let matched = false;
  try {
    matched = verifyAdminPin(parsed.data.pin);
  } catch {
    return jsonError(
      500,
      "SERVER_CONFIG_ERROR",
      "관리자 인증 환경 변수가 설정되지 않았습니다."
    );
  }

  if (!matched) {
    recordFailedPinAttempt(ip);
    await waitFailedAuthDelay();
    return jsonError(401, "INVALID_PIN", "비밀번호가 일치하지 않습니다.");
  }

  clearPinAttempts(ip);

  try {
    const response = NextResponse.json({ authenticated: true }, { status: 200 });
    attachAdminSessionCookie(response);
    return response;
  } catch {
    return jsonError(
      500,
      "SERVER_CONFIG_ERROR",
      "관리자 세션 서명 키가 설정되지 않았습니다."
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false }, { status: 200 });
  clearAdminSessionCookie(response);
  return response;
}
