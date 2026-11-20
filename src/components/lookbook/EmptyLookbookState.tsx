"use client";

import { RotateCcw, Sparkles } from "lucide-react";
import type { PublicListFilter } from "@/types/shop";

interface EmptyLookbookStateProps {
  filter: PublicListFilter;
  onResetFilter: () => void;
}

export function EmptyLookbookState({
  filter,
  onResetFilter,
}: EmptyLookbookStateProps) {
  const isFiltered = filter !== "all";

  return (
    <div className="editorial-card rounded-2xl p-8 md:p-10 text-center max-w-[540px] mx-auto my-6">
      <div className="w-14 h-14 rounded-2xl bg-accent-gold-tint border border-accent-gold/40 text-accent-gold-text mx-auto flex items-center justify-center mb-4">
        <Sparkles className="w-6 h-6" aria-hidden="true" />
      </div>

      <h2 className="font-serif text-section-title text-text-primary">
        {isFiltered
          ? "선택한 조건에 맞는 업체가 없어요"
          : "아직 정리된 메이크업 샵이 없어요"}
      </h2>

      <p className="text-body text-text-secondary mt-2">
        {isFiltered
          ? "다른 분류를 선택하시거나 전체 목록으로 돌아가 모든 후보를 살펴보세요."
          : "신랑·신부가 곧 후보 샵 사진과 가격 정보를 정리해 올릴 예정이에요."}
      </p>

      {isFiltered && (
        <button
          type="button"
          onClick={onResetFilter}
          className="mt-6 min-h-[48px] px-5 py-2.5 rounded-2xl bg-text-primary text-surface text-control inline-flex items-center justify-center gap-2 hover:bg-text-primary/90 cursor-pointer transition-colors"
        >
          <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>전체 후보 다시 보기</span>
        </button>
      )}
    </div>
  );
}
