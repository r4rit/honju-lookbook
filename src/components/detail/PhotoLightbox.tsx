"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import type { ShopImageDTO } from "@/types/shop";

interface PhotoLightboxProps {
  images: ShopImageDTO[];
  initialIndex: number;
  shopName: string;
  onClose: () => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.5;

export function PhotoLightbox({
  images,
  initialIndex,
  shopName,
  onClose,
}: PhotoLightboxProps) {
  const [index, setIndex] = useState(() =>
    Math.min(Math.max(0, initialIndex), Math.max(0, images.length - 1))
  );
  const [zoom, setZoom] = useState(1);

  const touchStartXRef = useRef<number | null>(null);

  const goPrev = useCallback(() => {
    setZoom(1);
    setIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const goNext = useCallback(() => {
    setZoom(1);
    setIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.min(MAX_ZOOM, Number((prev + ZOOM_STEP).toFixed(1))));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((prev) => Math.max(MIN_ZOOM, Number((prev - ZOOM_STEP).toFixed(1))));
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (images.length > 1 && event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      } else if (images.length > 1 && event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      } else if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomIn();
      } else if (event.key === "-") {
        event.preventDefault();
        zoomOut();
      } else if (event.key === "0") {
        event.preventDefault();
        setZoom(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, images.length, onClose, zoomIn, zoomOut]);

  const activeImage = images[index];
  if (!activeImage) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${shopName} 사진 크게 보기`}
      className="fixed inset-0 z-50 bg-[#1F1D1A]/94 text-surface flex flex-col overscroll-contain"
    >
      {/* Top Bar */}
      <div className="safe-top px-3 md:px-6 pt-3 pb-3 flex flex-wrap items-center justify-between gap-2 border-b border-surface/15">
        <span className="text-control text-surface px-2">
          {index + 1} / {images.length}
        </span>

        <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="min-h-[48px] px-3 py-2 rounded-xl bg-surface/12 text-surface text-control inline-flex items-center gap-1.5 hover:bg-surface/20 disabled:opacity-40 cursor-pointer"
          >
            <ZoomOut className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>축소</span>
          </button>

          <button
            type="button"
            onClick={() => setZoom(1)}
            disabled={zoom === 1}
            className="min-h-[48px] px-3 py-2 rounded-xl bg-surface/12 text-surface text-control inline-flex items-center justify-center hover:bg-surface/20 disabled:opacity-50 cursor-pointer"
          >
            <span>{Math.round(zoom * 100)}%</span>
          </button>

          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="min-h-[48px] px-3 py-2 rounded-xl bg-surface/12 text-surface text-control inline-flex items-center gap-1.5 hover:bg-surface/20 disabled:opacity-40 cursor-pointer"
          >
            <ZoomIn className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>확대</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] px-4 py-2 rounded-xl bg-surface text-text-primary text-control inline-flex items-center gap-1.5 hover:bg-surface/90 cursor-pointer ml-1"
          >
            <span>닫기</span>
            <X className="w-4 h-4 shrink-0" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Main Zoomable Stage */}
      <div
        style={{ touchAction: "pinch-zoom pan-x pan-y" }}
        className="flex-1 overflow-auto flex items-center justify-center p-3 md:p-6"
        onClick={(e) => {
          if (e.target === e.currentTarget && zoom === 1) {
            onClose();
          }
        }}
        onTouchStart={(e) => {
          if (zoom === 1 && e.touches[0]) {
            touchStartXRef.current = e.touches[0].clientX;
          }
        }}
        onTouchEnd={(e) => {
          if (zoom !== 1 || touchStartXRef.current === null || !e.changedTouches[0]) {
            touchStartXRef.current = null;
            return;
          }
          const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
          touchStartXRef.current = null;
          if (images.length > 1 && Math.abs(deltaX) > 48) {
            if (deltaX > 0) goPrev();
            else goNext();
          }
        }}
      >
        <div
          className="relative flex items-center justify-center transition-transform duration-200"
          style={{
            width: `${Math.round(zoom * 100)}%`,
            maxWidth: zoom === 1 ? "960px" : "none",
          }}
        >
          <div className="relative w-full aspect-[4/3]">
            <Image
              src={activeImage.public_url}
              alt={activeImage.caption || `${shopName} 사진 ${index + 1}`}
              fill
              sizes="100vw"
              priority
              className="object-contain select-none"
            />
          </div>
        </div>
      </div>

      {/* Bottom Controls & Caption */}
      <div className="safe-bottom px-4 py-3 border-t border-surface/15 bg-[#1F1D1A]/85 flex flex-wrap items-center justify-between gap-3">
        {images.length > 1 ? (
          <button
            type="button"
            onClick={goPrev}
            className="min-h-[48px] px-4 py-2 rounded-xl bg-surface/12 text-surface text-control inline-flex items-center gap-1.5 hover:bg-surface/20 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>이전 사진</span>
          </button>
        ) : (
          <span />
        )}

        <p className="text-body text-surface text-center flex-1 min-w-[160px]">
          {activeImage.caption || `${shopName} 참고 사진 ${index + 1}`}
        </p>

        {images.length > 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="min-h-[48px] px-4 py-2 rounded-xl bg-surface/12 text-surface text-control inline-flex items-center gap-1.5 hover:bg-surface/20 cursor-pointer"
          >
            <span>다음 사진</span>
            <ChevronRight className="w-4 h-4 shrink-0" aria-hidden="true" />
          </button>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
