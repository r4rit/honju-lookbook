import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Heart,
  ImageIcon,
  MapPin,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { SERVICE_TYPE_LABELS, type ShopListItemDTO } from "@/types/shop";

interface ShopCardProps {
  shop: ShopListItemDTO;
}

export function ShopCard({ shop }: ShopCardProps) {
  const visibleHighlights = shop.highlights.slice(0, 3);
  const serviceBadgeClass =
    shop.service_type === "onsite" || shop.service_type === "both"
      ? "bg-accent-sage-tint text-accent-sage-text"
      : "bg-surface-subtle text-text-secondary";

  return (
    <Link
      href={`/shops/${shop.id}`}
      className="group editorial-card rounded-2xl overflow-hidden flex flex-col h-full transition-all duration-200 md:hover:-translate-y-0.5 md:hover:shadow-[var(--shadow-card-hover)]"
    >
      <div className="relative aspect-[4/3] w-full bg-surface-subtle overflow-hidden border-b border-border">
        {shop.cover_image ? (
          <Image
            src={shop.cover_image.public_url}
            alt={shop.cover_image.caption || `${shop.name} 참고 사진`}
            fill
            sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 360px"
            className="object-cover transition-transform duration-300 md:group-hover:scale-[1.02]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-text-secondary">
            <ImageIcon className="w-8 h-8 opacity-60" aria-hidden="true" />
            <span className="text-caption">사진 준비 중</span>
          </div>
        )}

        {shop.status === "finalist" && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent-sage text-surface text-caption font-semibold shadow-sm">
            <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>최종 후보</span>
          </span>
        )}

        {shop.image_count > 1 && (
          <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-[#1F1D1A]/75 text-surface text-caption">
            사진 {shop.image_count}장
          </span>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {shop.region && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent-gold-tint text-accent-gold-text text-caption">
              <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{shop.region}</span>
            </span>
          )}
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-caption ${serviceBadgeClass}`}
          >
            {SERVICE_TYPE_LABELS[shop.service_type]}
          </span>
        </div>

        <div>
          <h2 className="text-card-title text-text-primary line-clamp-2 group-hover:text-accent-gold-text transition-colors">
            {shop.name}
          </h2>
          {shop.price_summary && (
            <p className="text-body-strong text-text-primary mt-1.5">
              {shop.price_summary}
            </p>
          )}
          {shop.venue_distance_note && (
            <p className="text-caption text-text-secondary mt-1">
              {shop.venue_distance_note}
            </p>
          )}
        </div>

        {visibleHighlights.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {visibleHighlights.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-lg bg-surface-subtle text-text-secondary text-caption"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-3.5 border-t border-border flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-semibold ${
                shop.vote_count > 0
                  ? "bg-accent-rose-tint text-accent-rose-text"
                  : "bg-surface-subtle text-text-secondary"
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 shrink-0 ${
                  shop.vote_count > 0 ? "fill-current" : ""
                }`}
                aria-hidden="true"
              />
              <span>{shop.vote_count}명 찜</span>
            </span>

            <span className="inline-flex items-center gap-1 text-caption text-text-secondary">
              <MessageCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>의견 {shop.comment_count}</span>
            </span>
          </div>

          <span className="inline-flex items-center gap-1 text-control text-accent-gold-text">
            <span>자세히 보기</span>
            <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}
