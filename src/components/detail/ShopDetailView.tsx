"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, MapPin, Sparkles } from "lucide-react";
import { FamilyCommentSection } from "@/components/detail/FamilyCommentSection";
import { FamilyVotePanel } from "@/components/detail/FamilyVotePanel";
import { MapActionButtons } from "@/components/detail/MapActionButtons";
import { MobileBottomActionBar } from "@/components/detail/MobileBottomActionBar";
import { PhotoGalleryViewer } from "@/components/detail/PhotoGalleryViewer";
import { ShopInfoCard } from "@/components/detail/ShopInfoCard";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { useFamilyIdentity } from "@/components/providers/FamilyIdentityProvider";
import {
  SERVICE_TYPE_LABELS,
  type FamilyRole,
  type ShopDetailDTO,
} from "@/types/shop";

interface ShopDetailViewProps {
  initialShop: ShopDetailDTO;
  isAdmin: boolean;
}

export function ShopDetailView({ initialShop, isAdmin }: ShopDetailViewProps) {
  const { role, requireRole } = useFamilyIdentity();

  const [voters, setVoters] = useState<FamilyRole[]>(initialShop.voters);
  const [isVoting, setIsVoting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  const executeToggleVote = async (targetRole: FamilyRole) => {
    if (isVoting) return;

    const previousVoters = voters;
    const currentlyVoted = previousVoters.includes(targetRole);
    const optimisticVoters = currentlyVoted
      ? previousVoters.filter((item) => item !== targetRole)
      : [...previousVoters, targetRole];

    setVoters(optimisticVoters);
    setVoteError(null);
    setIsVoting(true);

    try {
      const res = await fetch(`/api/shops/${initialShop.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ family_role: targetRole }),
      });

      const data = (await res.json().catch(() => null)) as {
        voters?: FamilyRole[];
        error?: { message?: string };
      } | null;

      if (!res.ok || !data?.voters) {
        setVoters(previousVoters);
        setVoteError(
          data?.error?.message ?? "마음에 들어요 저장에 실패했습니다."
        );
        return;
      }

      setVoters(data.voters);
    } catch {
      setVoters(previousVoters);
      setVoteError("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setIsVoting(false);
    }
  };

  const handleToggleVote = () => {
    requireRole((selectedRole) => {
      void executeToggleVote(selectedRole);
    });
  };

  const serviceBadgeClass =
    initialShop.service_type === "onsite" || initialShop.service_type === "both"
      ? "bg-accent-sage-tint text-accent-sage-text"
      : "bg-surface-subtle text-text-secondary";

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <PublicHeader
        backHref="/"
        backLabel="목록"
        pageTitle={initialShop.name}
      />

      <main className="flex-1 w-full max-w-[1040px] mx-auto px-4 md:px-6 pt-4 md:pt-7 pb-[calc(104px+env(safe-area-inset-bottom))] md:pb-14">
        <div className="hidden md:flex items-center mb-4">
          <Link
            href="/"
            className="min-h-[48px] px-3 py-2 -ml-3 rounded-xl inline-flex items-center gap-1.5 text-control text-text-secondary hover:text-text-primary hover:bg-surface/60 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>전체 후보 목록으로</span>
          </Link>
        </div>

        <div className="md:editorial-card md:rounded-3xl md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start">
          {/* Left Column: Sticky Gallery on Desktop */}
          <div className="md:col-span-6 md:sticky md:top-[92px]">
            <PhotoGalleryViewer
              images={initialShop.images}
              shopName={initialShop.name}
            />
          </div>

          {/* Right Column: Title, Badges, Vote, Maps, Info & Family Discussion */}
          <div className="md:col-span-6 space-y-6">
            <header className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {initialShop.status === "finalist" && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent-sage text-surface text-caption font-semibold">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>최종 후보</span>
                  </span>
                )}
                {initialShop.region && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent-gold-tint text-accent-gold-text text-caption">
                    <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{initialShop.region}</span>
                  </span>
                )}
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-caption ${serviceBadgeClass}`}
                >
                  {SERVICE_TYPE_LABELS[initialShop.service_type]}
                </span>
              </div>

              <h1 className="font-serif text-page-title text-text-primary">
                {initialShop.name}
              </h1>

              {initialShop.highlights.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {initialShop.highlights.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-lg bg-surface md:bg-surface-subtle border border-border text-text-secondary text-caption"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </header>

            <FamilyVotePanel
              voters={voters}
              currentRole={role}
              isVoting={isVoting}
              errorMsg={voteError}
              onToggleVote={handleToggleVote}
            />

            <MapActionButtons shop={initialShop} />

            <ShopInfoCard shop={initialShop} />

            <FamilyCommentSection
              shopId={initialShop.id}
              initialComments={initialShop.comments}
              isAdmin={isAdmin}
            />
          </div>
        </div>
      </main>

      <MobileBottomActionBar
        shop={initialShop}
        voters={voters}
        currentRole={role}
        isVoting={isVoting}
        onToggleVote={handleToggleVote}
      />
    </div>
  );
}
