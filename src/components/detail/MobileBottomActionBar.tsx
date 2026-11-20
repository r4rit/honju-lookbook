"use client";

import { Heart, MapPin } from "lucide-react";
import { buildNaverMapUrl } from "@/lib/map-links";
import type { FamilyRole, ShopDetailDTO } from "@/types/shop";

interface MobileBottomActionBarProps {
  shop: Pick<ShopDetailDTO, "name" | "address" | "naver_map_url">;
  voters: FamilyRole[];
  currentRole: FamilyRole | null;
  isVoting: boolean;
  onToggleVote: () => void;
}

export function MobileBottomActionBar({
  shop,
  voters,
  currentRole,
  isVoting,
  onToggleVote,
}: MobileBottomActionBarProps) {
  const hasVoted = currentRole !== null && voters.includes(currentRole);
  const naverMapUrl = buildNaverMapUrl(shop);

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 md:hidden bg-surface/96 backdrop-blur-md border-t border-border px-4 pt-3 safe-bottom-bar shadow-[0_-4px_16px_rgba(31,29,26,0.06)]">
      <div className="flex items-center gap-2 max-w-[600px] mx-auto">
        <button
          type="button"
          onClick={onToggleVote}
          disabled={isVoting}
          aria-pressed={hasVoted}
          className={`flex-1 min-w-0 min-h-[52px] px-2.5 py-2 rounded-2xl border text-control leading-tight text-center inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-70 ${
            hasVoted
              ? "bg-accent-rose-fill border-accent-rose-fill text-surface"
              : "bg-accent-rose-tint border-accent-rose text-accent-rose-text"
          }`}
        >
          <Heart
            className={`w-4 h-4 shrink-0 ${hasVoted ? "fill-current" : ""}`}
            aria-hidden="true"
          />
          <span>마음에 들어요 ({voters.length})</span>
        </button>

        <a
          href={naverMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-0 min-h-[52px] px-2.5 py-2 rounded-2xl bg-text-primary text-surface text-control leading-tight text-center inline-flex items-center justify-center gap-1.5"
        >
          <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>네이버 지도</span>
        </a>
      </div>
    </div>
  );
}
