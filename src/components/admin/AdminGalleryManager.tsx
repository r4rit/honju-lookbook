"use client";

import Image from "next/image";
import { ArrowDown, ArrowUp, Loader2, Star, Trash2 } from "lucide-react";
import type {
  AdminDraftImage,
  PendingUploadTile,
} from "@/components/admin/types";

interface AdminGalleryManagerProps {
  images: AdminDraftImage[];
  pendingUploads: PendingUploadTile[];
  onSetCover: (storagePath: string) => void;
  onMove: (index: number, direction: "prev" | "next") => void;
  onCaptionChange: (storagePath: string, caption: string) => void;
  onDelete: (image: AdminDraftImage) => void;
}

export function AdminGalleryManager({
  images,
  pendingUploads,
  onSetCover,
  onMove,
  onCaptionChange,
  onDelete,
}: AdminGalleryManagerProps) {
  if (images.length === 0 && pendingUploads.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface-subtle/50 p-6 text-center">
        <p className="text-body text-text-secondary">
          아직 등록된 참고 사진이 없어요.
        </p>
        <p className="text-caption text-text-secondary mt-1">
          네이버 지도나 인스타그램에서 사진을 캡처한 뒤 붙여넣어 보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-4">
      {images.map((img, index) => (
        <div
          key={img.storage_path}
          className={`rounded-2xl border p-3.5 bg-surface transition-colors ${
            img.is_cover ? "border-accent-gold shadow-sm" : "border-border"
          }`}
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-surface-subtle">
            <Image
              src={img.public_url}
              alt={img.caption || `참고 사진 ${index + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, 420px"
              className="object-cover"
            />
            {img.is_cover && (
              <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent-sage text-surface text-caption font-semibold shadow-sm">
                <Star className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                <span>대표 사진</span>
              </span>
            )}
            <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-[#1F1D1A]/70 text-surface text-caption">
              {index + 1} / {images.length}
            </span>
          </div>

          <div className="mt-3 space-y-2.5">
            <input
              type="text"
              maxLength={80}
              value={img.caption}
              onChange={(e) => onCaptionChange(img.storage_path, e.target.value)}
              placeholder="사진 설명 (예: 어머님 한복 올림머리)"
              aria-label={`사진 ${index + 1} 설명`}
              className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-border-strong bg-surface text-body text-text-primary placeholder:text-text-secondary/65 focus:outline-none focus:border-accent-gold"
            />

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onSetCover(img.storage_path)}
                aria-pressed={img.is_cover}
                className={`min-h-[48px] px-3 py-2 rounded-xl border text-control inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  img.is_cover
                    ? "bg-accent-gold-tint border-accent-gold text-accent-gold-text"
                    : "bg-surface border-border-strong text-text-primary hover:bg-surface-subtle"
                }`}
              >
                <Star
                  className={`w-4 h-4 shrink-0 ${img.is_cover ? "fill-current" : ""}`}
                  aria-hidden="true"
                />
                <span>{img.is_cover ? "대표 사진" : "대표 지정"}</span>
              </button>

              <button
                type="button"
                onClick={() => onMove(index, "prev")}
                disabled={index === 0}
                className="min-h-[48px] px-3 py-2 rounded-xl border border-border-strong bg-surface text-control text-text-primary inline-flex items-center gap-1 hover:bg-surface-subtle disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ArrowUp className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>이전</span>
              </button>

              <button
                type="button"
                onClick={() => onMove(index, "next")}
                disabled={index === images.length - 1}
                className="min-h-[48px] px-3 py-2 rounded-xl border border-border-strong bg-surface text-control text-text-primary inline-flex items-center gap-1 hover:bg-surface-subtle disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ArrowDown className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>다음</span>
              </button>

              <button
                type="button"
                onClick={() => onDelete(img)}
                className="min-h-[48px] px-3 py-2 rounded-xl border border-accent-rose/40 bg-surface text-control text-danger inline-flex items-center gap-1.5 hover:bg-accent-rose-tint cursor-pointer ml-auto"
              >
                <Trash2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>삭제</span>
              </button>
            </div>
          </div>
        </div>
      ))}

      {pendingUploads.map((pending) => (
        <div
          key={pending.tempId}
          className="rounded-2xl border border-accent-gold/50 bg-accent-gold-tint/40 p-3.5"
        >
          <div className="aspect-[4/3] w-full rounded-xl bg-surface flex flex-col items-center justify-center gap-2 border border-border">
            <Loader2
              className="w-7 h-7 text-accent-gold-text animate-spin"
              aria-hidden="true"
            />
            <span className="text-control text-accent-gold-text">
              압축 및 업로드 중...
            </span>
            <span className="text-caption text-text-secondary max-w-[200px] truncate px-3">
              {pending.fileName}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
