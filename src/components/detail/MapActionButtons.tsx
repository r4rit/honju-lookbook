import { ExternalLink, MapPin, Navigation } from "lucide-react";
import {
  buildKakaoMapUrl,
  buildNaverMapUrl,
  getSafeExternalUrl,
} from "@/lib/map-links";
import type { ShopDetailDTO } from "@/types/shop";

interface MapActionButtonsProps {
  shop: Pick<
    ShopDetailDTO,
    "name" | "address" | "naver_map_url" | "instagram_url"
  >;
}

export function MapActionButtons({ shop }: MapActionButtonsProps) {
  const naverUrl = buildNaverMapUrl(shop);
  const kakaoUrl = buildKakaoMapUrl(shop);
  const instagramUrl = getSafeExternalUrl(shop.instagram_url);

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <a
          href={naverUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[52px] px-4 py-3 rounded-2xl bg-text-primary text-surface text-control inline-flex items-center justify-center gap-2 hover:bg-text-primary/90 transition-colors"
        >
          <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>네이버 지도로 보기</span>
        </a>

        <a
          href={kakaoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[52px] px-4 py-3 rounded-2xl bg-accent-gold-tint border border-accent-gold text-accent-gold-text text-control inline-flex items-center justify-center gap-2 hover:bg-accent-gold/15 transition-colors"
        >
          <Navigation className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>카카오맵 길찾기</span>
        </a>
      </div>

      {instagramUrl && (
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full min-h-[52px] px-4 py-3 rounded-2xl bg-surface border border-border-strong text-control text-text-primary inline-flex items-center justify-center gap-2 hover:bg-surface-subtle transition-colors"
        >
          <span>인스타그램 원본 보기</span>
          <ExternalLink className="w-4 h-4 shrink-0" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}
