"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon, ZoomIn } from "lucide-react";
import { PhotoLightbox } from "@/components/detail/PhotoLightbox";
import type { ShopImageDTO } from "@/types/shop";

interface PhotoGalleryViewerProps {
  images: ShopImageDTO[];
  shopName: string;
}

export function PhotoGalleryViewer({
  images,
  shopName,
}: PhotoGalleryViewerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const mobileStripRef = useRef<HTMLDivElement>(null);

  const safeIndex = Math.min(activeIndex, Math.max(0, images.length - 1));
  const currentImage = images[safeIndex];

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const goNext = useCallback(() => {
    setActiveIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  useEffect(() => {
    if (lightboxOpen || images.length <= 1) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, images.length, lightboxOpen]);

  const handleMobileScroll = () => {
    const container = mobileStripRef.current;
    if (!container || container.clientWidth === 0) return;
    const nextIdx = Math.round(container.scrollLeft / container.clientWidth);
    if (nextIdx >= 0 && nextIdx < images.length && nextIdx !== activeIndex) {
      setActiveIndex(nextIdx);
    }
  };

  if (images.length === 0) {
    return (
      <div className="aspect-[4/3] w-full rounded-2xl border border-border bg-surface-subtle flex flex-col items-center justify-center gap-2 text-text-secondary p-6 text-center">
        <ImageIcon className="w-10 h-10 opacity-60" aria-hidden="true" />
        <p className="text-body">등록된 참고 사진이 아직 없어요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Mobile Touch Swipe Carousel */}
      <div className="md:hidden space-y-2.5">
        <div className="relative">
          <div
            ref={mobileStripRef}
            onScroll={handleMobileScroll}
            className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-2xl border border-border bg-surface-subtle overscroll-x-contain"
          >
            {images.map((img, idx) => (
              <div
                key={img.id || img.storage_path}
                className="relative w-full shrink-0 snap-center aspect-[4/3]"
              >
                <Image
                  src={img.public_url}
                  alt={img.caption || `${shopName} 참고 사진 ${idx + 1}`}
                  fill
                  sizes="100vw"
                  priority={idx === 0}
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setActiveIndex(idx);
                    setLightboxOpen(true);
                  }}
                  className="absolute bottom-3 left-3 min-h-[48px] px-3.5 py-2 rounded-full bg-surface/92 border border-border text-control text-text-primary inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <ZoomIn className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>사진 크게 보기</span>
                </button>
              </div>
            ))}
          </div>

          <span className="pointer-events-none absolute bottom-3 right-3 px-3 py-1 rounded-full bg-[#1F1D1A]/75 text-surface text-caption">
            {safeIndex + 1} / {images.length}
          </span>
        </div>

        {currentImage?.caption && (
          <p className="px-4 py-2.5 rounded-xl bg-surface-subtle border border-border text-body text-text-primary">
            {currentImage.caption}
          </p>
        )}
      </div>

      {/* Desktop Sticky Viewer + Thumbnails */}
      <div className="hidden md:block space-y-3">
        <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden border border-border bg-surface-subtle">
          {currentImage && (
            <Image
              src={currentImage.public_url}
              alt={currentImage.caption || `${shopName} 참고 사진 ${safeIndex + 1}`}
              fill
              sizes="520px"
              priority
              onClick={() => setLightboxOpen(true)}
              className="object-cover cursor-zoom-in"
            />
          )}

          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="absolute bottom-3 left-3 min-h-[48px] px-3.5 py-2 rounded-full bg-surface/92 border border-border text-control text-text-primary inline-flex items-center gap-1.5 shadow-sm hover:bg-surface cursor-pointer"
          >
            <ZoomIn className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>크게 보기</span>
          </button>

          <span className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-[#1F1D1A]/75 text-surface text-caption">
            {safeIndex + 1} / {images.length}
          </span>
        </div>

        {images.length > 1 && (
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={goPrev}
              className="min-h-[48px] px-4 py-2 rounded-xl border border-border-strong bg-surface text-control text-text-primary inline-flex items-center gap-1.5 hover:bg-surface-subtle cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>이전 사진</span>
            </button>

            <span className="text-caption text-text-secondary">
              방향키(← / →)로도 넘길 수 있어요
            </span>

            <button
              type="button"
              onClick={goNext}
              className="min-h-[48px] px-4 py-2 rounded-xl border border-border-strong bg-surface text-control text-text-primary inline-flex items-center gap-1.5 hover:bg-surface-subtle cursor-pointer"
            >
              <span>다음 사진</span>
              <ChevronRight className="w-4 h-4 shrink-0" aria-hidden="true" />
            </button>
          </div>
        )}

        {currentImage?.caption && (
          <p className="px-4 py-3 rounded-xl bg-surface-subtle border border-border text-body text-text-primary">
            {currentImage.caption}
          </p>
        )}

        {images.length > 1 && (
          <div className="grid grid-cols-5 gap-2">
            {images.map((img, idx) => {
              const isSelected = idx === safeIndex;
              return (
                <button
                  key={img.id || img.storage_path}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`${idx + 1}번 사진 보기`}
                  aria-pressed={isSelected}
                  className={`relative aspect-[4/3] min-h-[48px] rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    isSelected
                      ? "border-accent-gold ring-2 ring-accent-gold/30"
                      : "border-transparent opacity-75 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={img.public_url}
                    alt={img.caption || `${shopName} 썸네일 ${idx + 1}`}
                    fill
                    sizes="100px"
                    className="object-cover"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {lightboxOpen && (
        <PhotoLightbox
          images={images}
          initialIndex={safeIndex}
          shopName={shopName}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
