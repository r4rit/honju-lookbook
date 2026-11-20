import { z } from "zod";
import {
  FAMILY_ROLES,
  PUBLIC_LIST_FILTERS,
  SERVICE_TYPES,
  SHOP_STATUSES,
} from "@/types/shop";

export const uuidSchema = z.string().uuid("올바른 식별자 형식이 아닙니다.");

export const familyRoleSchema = z.enum(FAMILY_ROLES, {
  errorMap: () => ({ message: "올바른 가족 역할을 선택해 주세요." }),
});

export const shopStatusSchema = z.enum(SHOP_STATUSES, {
  errorMap: () => ({ message: "올바른 후보 상태를 선택해 주세요." }),
});

export const serviceTypeSchema = z.enum(SERVICE_TYPES, {
  errorMap: () => ({ message: "올바른 이용 형태를 선택해 주세요." }),
});

export const publicListFilterSchema = z
  .enum(PUBLIC_LIST_FILTERS)
  .default("all");

export const nullableHttpUrlValueSchema = z
  .union([z.string(), z.null()])
  .transform((val) => {
    if (val === null) return null;
    const trimmed = val.trim();
    return trimmed.length === 0 ? null : trimmed;
  })
  .refine(
    (val) => {
      if (val === null) return true;
      try {
        const parsed = new URL(val);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "http:// 또는 https://로 시작하는 올바른 링크를 입력해 주세요." }
  );

export const optionalHttpUrlSchema = nullableHttpUrlValueSchema
  .optional()
  .default(null);

export const nullableRawSourceTextValueSchema = z
  .union([z.string(), z.null()])
  .transform((val) => {
    if (val === null) return null;
    const trimmed = val.trim();
    return trimmed.length === 0 ? null : trimmed;
  });

export const highlightTagSchema = z
  .string()
  .transform((val) => val.trim().replace(/^#+/, "").trim())
  .refine((val) => val.length >= 1 && val.length <= 20, {
    message: "특징 태그는 1~20자 이내로 입력해 주세요.",
  });

export const shopImageInputSchema = z.object({
  id: uuidSchema.optional(),
  storage_path: z
    .string()
    .trim()
    .min(1, "이미지 저장 경로가 필요합니다.")
    .max(300),
  public_url: z
    .string()
    .trim()
    .url("올바른 이미지 URL이 아닙니다.")
    .refine(
      (url) => url.startsWith("https://") || url.startsWith("http://"),
      "올바른 이미지 URL이 아닙니다."
    ),
  caption: z
    .string()
    .trim()
    .max(80, "사진 설명은 80자 이내로 입력해 주세요.")
    .default(""),
  is_cover: z.boolean().default(false),
  sort_order: z.number().int().min(0).default(0),
});

export type ShopImageInput = z.infer<typeof shopImageInputSchema>;

export const createShopSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "업체명을 입력해 주세요.")
    .max(120, "업체명은 120자 이내로 입력해 주세요."),
  status: shopStatusSchema.default("candidate"),
  region: z.string().trim().max(60).default(""),
  address: z.string().trim().max(240).default(""),
  venue_distance_note: z.string().trim().max(160).default(""),
  service_type: serviceTypeSchema.default("shop"),
  price_summary: z.string().trim().max(160).default(""),
  parking_info: z.string().trim().max(240).default(""),
  business_hours: z.string().trim().max(200).default(""),
  highlights: z
    .array(highlightTagSchema)
    .max(8, "특징 태그는 최대 8개까지 입력할 수 있습니다.")
    .default([]),
  pros: z.string().trim().max(1000).default(""),
  cons: z.string().trim().max(1000).default(""),
  summary_note: z.string().trim().max(1000).default(""),
  naver_map_url: optionalHttpUrlSchema,
  instagram_url: optionalHttpUrlSchema,
  raw_source_text: nullableRawSourceTextValueSchema.optional().default(null),
  images: z.array(shopImageInputSchema).max(30).default([]),
});

export type CreateShopInput = z.infer<typeof createShopSchema>;

export const updateShopSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "업체명을 입력해 주세요.")
    .max(120, "업체명은 120자 이내로 입력해 주세요.")
    .optional(),
  status: shopStatusSchema.optional(),
  region: z.string().trim().max(60).optional(),
  address: z.string().trim().max(240).optional(),
  venue_distance_note: z.string().trim().max(160).optional(),
  service_type: serviceTypeSchema.optional(),
  price_summary: z.string().trim().max(160).optional(),
  parking_info: z.string().trim().max(240).optional(),
  business_hours: z.string().trim().max(200).optional(),
  highlights: z
    .array(highlightTagSchema)
    .max(8, "특징 태그는 최대 8개까지 입력할 수 있습니다.")
    .optional(),
  pros: z.string().trim().max(1000).optional(),
  cons: z.string().trim().max(1000).optional(),
  summary_note: z.string().trim().max(1000).optional(),
  naver_map_url: nullableHttpUrlValueSchema.optional(),
  instagram_url: nullableHttpUrlValueSchema.optional(),
  raw_source_text: nullableRawSourceTextValueSchema.optional(),
  images: z.array(shopImageInputSchema).max(30).optional(),
});

export type UpdateShopInput = z.infer<typeof updateShopSchema>;

export const voteRequestSchema = z.object({
  family_role: familyRoleSchema,
});

export const createCommentSchema = z.object({
  family_role: familyRoleSchema,
  content: z
    .string()
    .trim()
    .min(1, "의견 내용을 입력해 주세요.")
    .max(500, "의견은 500자 이내로 입력해 주세요."),
});

export const parseRawTextSchema = z.object({
  raw_text: z
    .string()
    .trim()
    .min(10, "정리할 업체 안내 텍스트를 10자 이상 붙여넣어 주세요.")
    .max(15000, "붙여넣은 텍스트는 15,000자 이내로 입력해 주세요."),
});

export const parsedShopDraftSchema = z.object({
  name: z.string().trim().max(120).default(""),
  region: z.string().trim().max(60).default(""),
  address: z.string().trim().max(240).default(""),
  price_summary: z.string().trim().max(160).default(""),
  service_type: serviceTypeSchema.catch("shop"),
  parking_info: z.string().trim().max(240).default(""),
  business_hours: z.string().trim().max(200).default(""),
  highlights: z
    .array(z.string())
    .default([])
    .transform((items) =>
      items
        .map((item) => item.trim().replace(/^#+/, "").trim())
        .filter((item) => item.length >= 1 && item.length <= 20)
        .slice(0, 5)
    ),
  pros: z.string().trim().max(1000).default(""),
  cons: z.string().trim().max(1000).default(""),
  summary_note: z.string().trim().max(1000).default(""),
});

export const adminPinSchema = z.object({
  pin: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "4자리 숫자 비밀번호를 입력해 주세요."),
});

export const deleteUploadSchema = z.object({
  storage_path: z
    .string()
    .trim()
    .regex(
      /^shops\/\d{6}\/[0-9a-f-]{36}\.(webp|jpg|jpeg|png)$/,
      "올바른 이미지 저장 경로가 아닙니다."
    ),
});

export function formatZodFieldErrors(
  error: z.ZodError
): Record<string, string[]> {
  const fieldErrors = error.flatten().fieldErrors;
  const result: Record<string, string[]> = {};

  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (Array.isArray(messages) && messages.length > 0) {
      result[key] = messages;
    }
  }

  return result;
}
