"use client";

import { useMemo, useState } from "react";
import { EmptyLookbookState } from "@/components/lookbook/EmptyLookbookState";
import { FilterChipBar } from "@/components/lookbook/FilterChipBar";
import { ShopCard } from "@/components/lookbook/ShopCard";
import type { PublicListFilter, ShopListItemDTO } from "@/types/shop";

interface ShopLookbookClientProps {
  initialShops: ShopListItemDTO[];
  initialFilter: PublicListFilter;
  loadError?: string | null;
}

function filterAndSortShops(
  shops: ShopListItemDTO[],
  filter: PublicListFilter
): ShopListItemDTO[] {
  const filtered = shops.filter((shop) => {
    if (filter === "shop") {
      return shop.service_type === "shop" || shop.service_type === "both";
    }
    if (filter === "onsite") {
      return shop.service_type === "onsite" || shop.service_type === "both";
    }
    return true;
  });

  const sorted = [...filtered];
  if (filter === "popular") {
    sorted.sort((a, b) => {
      if (b.vote_count !== a.vote_count) return b.vote_count - a.vote_count;
      const aRank = a.status === "finalist" ? 0 : 1;
      const bRank = b.status === "finalist" ? 0 : 1;
      if (aRank !== bRank) return aRank - bRank;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  } else {
    sorted.sort((a, b) => {
      const aRank = a.status === "finalist" ? 0 : 1;
      const bRank = b.status === "finalist" ? 0 : 1;
      if (aRank !== bRank) return aRank - bRank;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  return sorted;
}

export function ShopLookbookClient({
  initialShops,
  initialFilter,
  loadError = null,
}: ShopLookbookClientProps) {
  const [allShops, setAllShops] = useState<ShopListItemDTO[]>(initialShops);
  const [activeFilter, setActiveFilter] =
    useState<PublicListFilter>(initialFilter);
  const [fetchError, setFetchError] = useState<string | null>(loadError);

  const visibleShops = useMemo(
    () => filterAndSortShops(allShops, activeFilter),
    [allShops, activeFilter]
  );

  const handleSelectFilter = async (nextFilter: PublicListFilter) => {
    setActiveFilter(nextFilter);

    if (typeof window !== "undefined") {
      const nextUrl =
        nextFilter === "all" ? "/" : `/?filter=${encodeURIComponent(nextFilter)}`;
      window.history.replaceState(null, "", nextUrl);
    }

    try {
      const res = await fetch("/api/shops?filter=all", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json().catch(() => null)) as {
        shops?: ShopListItemDTO[];
      } | null;
      if (data?.shops) {
        setAllShops(data.shops);
        setFetchError(null);
      }
    } catch {
      // Keep client-side filtered view if background refresh fails
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <FilterChipBar
          activeFilter={activeFilter}
          onSelectFilter={handleSelectFilter}
        />
        <span className="text-caption text-text-secondary shrink-0">
          총 {visibleShops.length}곳 정리됨
        </span>
      </div>

      {fetchError && (
        <div
          role="alert"
          className="px-4 py-3.5 rounded-2xl bg-accent-rose-tint border border-accent-rose/40 text-danger text-body"
        >
          {fetchError}
        </div>
      )}

      {visibleShops.length === 0 ? (
        <EmptyLookbookState
          filter={activeFilter}
          onResetFilter={() => handleSelectFilter("all")}
        />
      ) : (
        <section
          aria-label="혼주 메이크업 후보 목록"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6"
        >
          {visibleShops.map((shop) => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </section>
      )}
    </div>
  );
}
