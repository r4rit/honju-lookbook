import "server-only";

import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { parsedShopDraftSchema } from "@/lib/validators";
import type { ParsedShopDraftDTO } from "@/types/shop";

const shopParseResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: {
      type: Type.STRING,
      description: "업체명(살롱/메이크업샵 이름). 텍스트에 없으면 빈 문자열.",
    },
    region: {
      type: Type.STRING,
      description:
        "간결한 지역명 (예: '강남·청담', '잠실·송파', '서초·반포'). 없으면 빈 문자열.",
    },
    address: {
      type: Type.STRING,
      description: "도로명 또는 지번 주소. 없으면 빈 문자열.",
    },
    price_summary: {
      type: Type.STRING,
      description:
        "혼주 기준 예상 가격 요약 (예: '1인 22~25만원 (헤어+메이크업)'). 없으면 빈 문자열.",
    },
    service_type: {
      type: Type.STRING,
      enum: ["shop", "onsite", "both"],
      description:
        "'shop'(샵 방문), 'onsite'(출장 전용), 'both'(샵 방문 및 출장 모두 가능). 언급 없으면 'shop'.",
    },
    parking_info: {
      type: Type.STRING,
      description: "주차 가능 여부, 발렛 비용, 무료 시간 등. 없으면 빈 문자열.",
    },
    business_hours: {
      type: Type.STRING,
      description: "영업시간 및 새벽 예약 가능 여부. 없으면 빈 문자열.",
    },
    highlights: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        "핵심 특징 짧은 한국어 태그 3~5개 (앞에 '#' 기호 제외, 각 2~10자. 예: '한복올림머리', '자연스러운피부', '새벽예약').",
    },
    pros: {
      type: Type.STRING,
      description:
        "혼주(부모님) 관점에서의 장점 1~3문장. 텍스트에 근거한 내용만 작성.",
    },
    cons: {
      type: Type.STRING,
      description:
        "주의할 점/아쉬운 점 1~2문장 (예약 마감 빠름, 주차비 등). 텍스트에 없으면 빈 문자열(지어내지 말 것).",
    },
    summary_note: {
      type: Type.STRING,
      description:
        "50~70대 부모님이 읽기 편한 정중하고 따뜻한 한두 문장 요약.",
    },
  },
  required: [
    "name",
    "region",
    "address",
    "price_summary",
    "service_type",
    "parking_info",
    "business_hours",
    "highlights",
    "pros",
    "cons",
    "summary_note",
  ],
};

const SYSTEM_INSTRUCTION = `
당신은 한국 결혼식 혼주(어머님·아버님) 메이크업 및 헤어 샵 정보를 가족들에게 보기 쉽게 정리하는 전문 큐레이터입니다.
사용자가 네이버 지도, 인스타그램, 블로그, 카카오톡 등에서 복사해 붙여넣은 원문 텍스트만 근거로 JSON을 추출하세요.

[필수 규칙]
1. 원문에 없는 가격, 주소, 주차 정보, 영업시간, 단점(cons)은 절대로 추측하거나 지어내지 말고 빈 문자열("")로 반환하세요.
2. 불필요한 이모지, 과도한 홍보성 감탄사, 해시태그(#) 기호는 모두 제거하세요.
3. highlights 배열에는 혼주 입장에서 중요한 핵심 특징 3~5개만 2~10자 이내의 짧은 한국어 구절('#'' 제외)로 담으세요. 원문 정보가 극히 적으면 확인되는 것만 담으세요.
4. pros, cons, summary_note는 50~70대 부모님이 스마트폰으로 읽기 편하도록 정중하고 부드러운 한국어(해요체)로 작성하세요.
`.trim();

function sanitizeMatchedUrl(rawMatch: string): string | null {
  const cleaned = rawMatch.replace(/[.,;)\]}'">]+$/g, "");
  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function detectSourceUrls(rawText: string): {
  detected_naver_map_url: string | null;
  detected_instagram_url: string | null;
} {
  const naverMatch = rawText.match(
    /https?:\/\/(?:naver\.me|map\.naver\.com|m\.place\.naver\.com|place\.naver\.com)\/[^\s<>"')}\]]+/i
  );
  const instagramMatch = rawText.match(
    /https?:\/\/(?:www\.)?instagram\.com\/[^\s<>"')}\]]+/i
  );

  return {
    detected_naver_map_url: naverMatch ? sanitizeMatchedUrl(naverMatch[0]) : null,
    detected_instagram_url: instagramMatch
      ? sanitizeMatchedUrl(instagramMatch[0])
      : null,
  };
}

function getGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error("Missing required environment variable: GEMINI_API_KEY");
  }
  return apiKey.trim();
}

export class GeminiOverloadedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiOverloadedError";
  }
}

const DEFAULT_PRIMARY_MODEL = "gemini-3.1-flash-lite";
const FALLBACK_MODEL = "gemini-3.8-flash";
const TRANSIENT_RETRY_DELAY_MS = 600;

function buildModelCandidates(): string[] {
  const configured = process.env.GEMINI_MODEL?.trim();
  const list = configured
    ? [configured, DEFAULT_PRIMARY_MODEL, FALLBACK_MODEL]
    : [DEFAULT_PRIMARY_MODEL, FALLBACK_MODEL];
  return Array.from(new Set(list));
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") return status;
  }
  return undefined;
}

function isTransientOverloadError(error: unknown): boolean {
  const status = getErrorStatus(error);
  if (status === 503 || status === 429) return true;

  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('"code":503') ||
    message.includes('"code":429') ||
    message.includes("UNAVAILABLE") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.toLowerCase().includes("high demand")
  );
}

function isModelNotFoundError(error: unknown): boolean {
  const status = getErrorStatus(error);
  if (status === 404) return true;

  const message = error instanceof Error ? error.message : String(error);
  return message.includes('"code":404') || message.includes("NOT_FOUND");
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function parseShopRawText(
  rawText: string
): Promise<ParsedShopDraftDTO> {
  const apiKey = getGeminiApiKey();
  const useVertexAi = process.env.GEMINI_USE_VERTEXAI === "true";
  const ai = new GoogleGenAI(
    useVertexAi ? { vertexai: true, apiKey } : { apiKey }
  );

  const models = buildModelCandidates();
  let lastError: unknown = null;
  let sawOverload = false;

  for (let i = 0; i < models.length; i += 1) {
    const model = models[i];
    if (!model) continue;

    // Retry the primary model once on transient 503/429 before falling back
    const maxAttempts = i === 0 ? 2 : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: rawText,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema: shopParseResponseSchema,
            temperature: 0.1,
          },
        });

        const responseText = response.text;
        if (!responseText || responseText.trim().length === 0) {
          throw new Error("Gemini returned an empty response.");
        }

        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(responseText);
        } catch {
          throw new Error("Gemini returned malformed JSON.");
        }

        const validated = parsedShopDraftSchema.safeParse(parsedJson);
        if (!validated.success) {
          throw new Error("Gemini output failed schema validation.");
        }

        const urls = detectSourceUrls(rawText);

        return {
          ...validated.data,
          ...urls,
        };
      } catch (error) {
        lastError = error;

        if (isTransientOverloadError(error)) {
          sawOverload = true;
          if (attempt < maxAttempts) {
            await waitMs(TRANSIENT_RETRY_DELAY_MS);
            continue;
          }
          break;
        }

        if (isModelNotFoundError(error)) {
          break;
        }

        throw error;
      }
    }
  }

  if (sawOverload) {
    const reason =
      lastError instanceof Error ? lastError.message : "Gemini overloaded";
    throw new GeminiOverloadedError(reason);
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error("Gemini parse failed.");
}
