import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  jsonError,
  parseJsonBody,
  unauthorizedResponse,
} from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabase/server";
import { deleteUploadSchema, formatZodFieldErrors } from "@/lib/validators";

export const preferredRegion = "icn1";
export const dynamic = "force-dynamic";

const BUCKET_NAME = "shop-images";
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

interface DetectedImageType {
  mime: "image/webp" | "image/jpeg" | "image/png";
  ext: "webp" | "jpg" | "png";
}

function detectImageType(bytes: Uint8Array): DetectedImageType | null {
  // WebP: "RIFF" (0..3) + "WEBP" (8..11)
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { mime: "image/webp", ext: "webp" };
  }

  // JPEG: FF D8 FF
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return { mime: "image/jpeg", ext: "jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { mime: "image/png", ext: "png" };
  }

  return null;
}

function isDeclaredMimeCompatible(
  declaredMime: string,
  detected: DetectedImageType["mime"]
): boolean {
  const normalized = declaredMime.trim().toLowerCase();
  if (!normalized || normalized === "application/octet-stream") {
    return true;
  }
  if (detected === "image/jpeg") {
    return normalized === "image/jpeg" || normalized === "image/jpg";
  }
  return normalized === detected;
}

function getYearMonthPrefix(): string {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}${month}`;
}

export async function POST(request: Request) {
  if (!(await requireAdminSession())) {
    return unauthorizedResponse();
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError(
      400,
      "INVALID_MULTIPART",
      "이미지 업로드 형식이 올바르지 않습니다."
    );
  }

  const fileEntry = formData.get("file");
  if (!(fileEntry instanceof File)) {
    return jsonError(400, "MISSING_FILE", "업로드할 이미지 파일이 없습니다.");
  }

  if (fileEntry.size <= 0) {
    return jsonError(400, "EMPTY_FILE", "빈 파일은 업로드할 수 없습니다.");
  }

  if (fileEntry.size > MAX_FILE_BYTES) {
    return jsonError(
      400,
      "FILE_TOO_LARGE",
      "이미지는 5MB 이하만 업로드할 수 있습니다."
    );
  }

  const buffer = Buffer.from(await fileEntry.arrayBuffer());
  const detected = detectImageType(buffer);
  if (!detected || !isDeclaredMimeCompatible(fileEntry.type, detected.mime)) {
    return jsonError(
      400,
      "INVALID_IMAGE_TYPE",
      "WebP, JPEG, PNG 형식의 실제 이미지 파일만 업로드할 수 있습니다."
    );
  }

  const storagePath = `shops/${getYearMonthPrefix()}/${randomUUID()}.${detected.ext}`;

  try {
    const admin = supabaseAdmin();
    const { error: uploadError } = await admin.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: detected.mime,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      return jsonError(
        500,
        "STORAGE_UPLOAD_FAILED",
        `이미지 저장에 실패했습니다: ${uploadError.message}`
      );
    }

    const { data: urlData } = admin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    return NextResponse.json(
      {
        storage_path: storagePath,
        public_url: urlData.publicUrl,
        content_type: detected.mime,
        size_bytes: buffer.byteLength,
      },
      { status: 201 }
    );
  } catch {
    return jsonError(
      500,
      "STORAGE_ERROR",
      "스토리지 연결 중 오류가 발생했습니다."
    );
  }
}

export async function DELETE(request: Request) {
  if (!(await requireAdminSession())) {
    return unauthorizedResponse();
  }

  const bodyResult = await parseJsonBody(request);
  if (!bodyResult.ok) {
    return bodyResult.response;
  }

  const validated = deleteUploadSchema.safeParse(bodyResult.data);
  if (!validated.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "삭제할 이미지 경로를 확인해 주세요.",
      formatZodFieldErrors(validated.error)
    );
  }

  const { storage_path: storagePath } = validated.data;

  try {
    const admin = supabaseAdmin();

    const { data: linkedRow, error: lookupError } = await admin
      .from("shop_images")
      .select("id")
      .eq("storage_path", storagePath)
      .maybeSingle();

    if (lookupError) {
      return jsonError(
        500,
        "DB_QUERY_FAILED",
        "이미지 사용 여부를 확인하지 못했습니다."
      );
    }

    if (linkedRow) {
      return jsonError(
        409,
        "IMAGE_IN_USE",
        "저장된 업체에 연결된 이미지는 업체 편집에서 삭제 후 저장해 주세요."
      );
    }

    const { error: removeError } = await admin.storage
      .from(BUCKET_NAME)
      .remove([storagePath]);

    if (removeError) {
      return jsonError(
        500,
        "STORAGE_DELETE_FAILED",
        `이미지 삭제에 실패했습니다: ${removeError.message}`
      );
    }

    return NextResponse.json({ deleted: true }, { status: 200 });
  } catch {
    return jsonError(
      500,
      "STORAGE_ERROR",
      "이미지 삭제 처리 중 오류가 발생했습니다."
    );
  }
}
