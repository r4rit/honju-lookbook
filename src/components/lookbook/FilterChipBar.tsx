"use client";

import type { PublicListFilter } from "@/types/shop";

interface FilterChipBarProps {
  activeFilter: PublicListFilter;
  onSelectFilter: (filter: PublicListFilter) => void;
}

const FILTER_OPTIONS: ReadonlyArray<{
  key: PublicListFilter;
  label: string;
}> = [
  { key: "all", label: "전체" },
  { key: "shop", label: "샵 방문" },
  { key: "onsite", label: "출장 가능" },
  { key: "popular", label: "가족 찜 많은 순" },
];

export function FilterChipBar({
  activeFilter,
  onSelectFilter,
}: FilterChipBarProps) {
  return (
    <nav
      aria-label="업체 분류 필터"
      className="flex items-center gap-2 overflow-x-auto no-scrollbar md:flex-wrap md:overflow-visible -mx-4 px-4 md:mx-0 md:px-0 py-1"
    >
      {FILTER_OPTIONS.map((option) => {
        const isActive = activeFilter === option.key;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onSelectFilter(option.key)}
            aria-pressed={isActive}
            className={`min-h-[48px] px-4 py-2.5 rounded-full border text-control inline-flex items-center shrink-0 whitespace-nowrap transition-colors cursor-pointer ${
              isActive
                ? "bg-text-primary border-text-primary text-surface"
                : "bg-surface border-border-strong text-text-secondary hover:bg-surface-subtle hover:text-text-primary"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </nav>
  );
}
