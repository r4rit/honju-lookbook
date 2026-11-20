"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { ClipboardPaste, ImagePlus } from "lucide-react";
import { compressImageToWebpOrJpeg } from "@/lib/image-compress";
import type {
  AdminDraftImage,
  PendingUploadTile,
} from "@/components/admin/types";

interface ClipboardImageUploaderProps {
  currentImageCount: number;
  onStartUpload: (tiles: PendingUploadTile[]) => void;
  onFinishUpload: (
    tempId: string,
    uploaded: AdminDraftImage | null,
    errorMsg?: string
  ) => void;
  onUnauthorized: () => void;
}

const MAX_SHOP_IMAGES = 30;

export function ClipboardImageUploader({
  currentImageCount,
  onStartUpload,
  onFinishUpload,
  onUnauthorized,
}: ClipboardImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentCountRef = useRef(currentImageCount);

  useEffect(() => {
    currentCountRef.current = currentImageCount;
  }, [currentImageCount]);

  const processFiles = useCallback(
    async (rawFiles: File[]) => {
      const imageFiles = rawFiles.filter(
        (file) =>
          file.type.startsWith("image/") ||
          /\.(webp|jpe?g|png|gif|heic)$/i.test(file.name)
      );

      if (imageFiles.length === 0) {
        setLocalError("이미지 파일(JPG, PNG, WebP 등)만 올릴 수 있어요.");
        return;
      }

      const remainingSlots = MAX_SHOP_IMAGES - currentCountRef.current;
      if (remainingSlots <= 0) {
        setLocalError(`사진은 업체당 최대 ${MAX_SHOP_IMAGES}장까지 올릴 수 있어요.`);
        return;
      }

      setLocalError(null);

      const filesToUpload = imageFiles.slice(0, remainingSlots);
      if (imageFiles.length > remainingSlots) {
        setLocalError(
          `최대 ${MAX_SHOP_IMAGES}장 제한으로 ${filesToUpload.length}장만 먼저 업로드해요.`
        );
      }

      const queued = filesToUpload.map((file, idx) => ({
        file,
        tile: {
          tempId: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
          fileName: file.name || "클립보드 이미지",
        },
      }));

      onStartUpload(queued.map((item) => item.tile));

      for (const { file, tile } of queued) {
        try {
          const compressed = await compressImageToWebpOrJpeg(file);
          const formData = new FormData();
          formData.append(
            "file",
            compressed.blob,
            `shop-photo.${compressed.extension}`
          );

          const res = await fetch("/api/admin/upload", {
            method: "POST",
            body: formData,
          });

          if (res.status === 401) {
            onFinishUpload(tile.tempId, null);
            onUnauthorized();
            return;
          }

          const data = (await res.json().catch(() => null)) as {
            storage_path?: string;
            public_url?: string;
            error?: { message?: string };
          } | null;

          if (!res.ok || !data?.storage_path || !data?.public_url) {
            onFinishUpload(
              tile.tempId,
              null,
              data?.error?.message ?? "이미지 업로드에 실패했습니다."
            );
            continue;
          }

          onFinishUpload(tile.tempId, {
            storage_path: data.storage_path,
            public_url: data.public_url,
            caption: "",
            is_cover: false,
            sort_order: 0,
            persisted: false,
          });
        } catch (error) {
          const msg =
            error instanceof Error
              ? error.message
              : "이미지 압축 또는 업로드 중 오류가 발생했습니다.";
          onFinishUpload(tile.tempId, null, msg);
        }
      }
    },
    [onFinishUpload, onStartUpload, onUnauthorized]
  );

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      // Allow normal text pasting inside form inputs and textareas
      const activeEl = document.activeElement;
      if (
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        (activeEl instanceof HTMLElement && activeEl.isContentEditable)
      ) {
        return;
      }

      const items = event.clipboardData?.items;
      const pastedImages: File[] = [];

      if (items) {
        for (const item of Array.from(items)) {
          if (item.kind === "file" && item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) pastedImages.push(file);
          }
        }
      } else if (event.clipboardData?.files) {
        for (const file of Array.from(event.clipboardData.files)) {
          if (file.type.startsWith("image/")) {
            pastedImages.push(file);
          }
        }
      }

      if (pastedImages.length > 0) {
        event.preventDefault();
        void processFiles(pastedImages);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [processFiles]);

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(event.dataTransfer.files);
    if (dropped.length > 0) {
      void processFiles(dropped);
    }
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selected.length > 0) {
      void processFiles(selected);
    }
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${
          isDragging
            ? "border-accent-gold bg-accent-gold-tint/70"
            : "border-border-strong bg-surface-subtle/60"
        }`}
      >
        <div className="w-12 h-12 rounded-2xl bg-surface border border-border mx-auto flex items-center justify-center text-accent-gold-text mb-3">
          <ClipboardPaste className="w-6 h-6" aria-hidden="true" />
        </div>

        <p className="text-body-strong text-text-primary">
          화면 캡처 후 Ctrl+V (맥: ⌘+V)로 바로 붙여넣기
        </p>
        <p className="text-caption text-text-secondary mt-1">
          또는 이미지를 여기에 끌어다 놓으세요 (자동 WebP 압축 · 최대 1400px)
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInputChange}
          className="sr-only"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 min-h-[48px] px-5 py-2.5 rounded-xl bg-surface border border-border-strong text-control text-text-primary inline-flex items-center justify-center gap-2 hover:bg-surface-subtle transition-colors cursor-pointer"
        >
          <ImagePlus className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>사진 파일 선택하기</span>
        </button>
      </div>

      {localError && (
        <p
          role="alert"
          className="px-4 py-3 rounded-xl bg-accent-rose-tint border border-accent-rose/30 text-danger text-caption"
        >
          {localError}
        </p>
      )}
    </div>
  );
}
