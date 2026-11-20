"use client";

import Image from "next/image";
import { Plus } from "lucide-react";
import {
  SHOP_STATUSES,
  SHOP_STATUS_LABELS,
  type AdminShopDetailDTO,
  type ShopStatus,
} from "@/types/shop";

interface AdminShopListBarProps {
  shops: AdminShopDetailDTO[];
  selectedShopId: string | null;
  statusFilter: "all" | ShopStatus;
  onStatusFilterChange: (next: "all" | ShopStatus) => void;
  onSelectShop: (shop: AdminShopDetailDTO) => void;
  onStartNewShop: () => void;
}

export function AdminShopListBar({
  shops,
  selectedShopId,
  statusFilter,
  onStatusFilterChange,
  onSelectShop,
  onStartNewShop,
}: AdminShopListBarProps) {
  const counts: Record<"all" | ShopStatus, number> = {
    all: shops.length,
    candidate: shops.filter((s) => s.status === "candidate").length,
    finalist: shops.filter((s) => s.status === "finalist").length,
    excluded: shops.filter((s) => s.status === "excluded").length,
  };

  const filteredShops =
    statusFilter === "all"
      ? shops
      : shops.filter((s) => s.status === statusFilter);

  return (
    <section className="editorial-card rounded-2xl p-4 md:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onStatusFilterChange("all")}
            aria-pressed={statusFilter === "all"}
            className={`min-h-[48px] px-4 py-2 rounded-full border text-control cursor-pointer transition-colors ${
              statusFilter === "all"
                ? "bg-text-primary border-text-primary text-surface"
                : "bg-surface border-border-strong text-text-secondary hover:bg-surface-subtle"
            }`}
          >
            전체 ({counts.all})
          </button>

          {SHOP_STATUSES.map((status) => {
            const active = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => onStatusFilterChange(status)}
                aria-pressed={active}
                className={`min-h-[48px] px-4 py-2 rounded-full border text-control cursor-pointer transition-colors ${
                  active
                    ? "bg-accent-gold-tint border-accent-gold text-accent-gold-text"
                    : "bg-surface border-border-strong text-text-secondary hover:bg-surface-subtle"
                }`}
              >
                {SHOP_STATUS_LABELS[status]} ({counts[status]})
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onStartNewShop}
          className={`min-h-[48px] px-4 py-2 rounded-xl border text-control inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
            selectedShopId === null
              ? "bg-accent-sage-tint border-accent-sage text-accent-sage-text"
              : "bg-surface border-border-strong text-text-primary hover:bg-surface-subtle"
          }`}
        >
          <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>새 업체 작성 중</span>
        </button>
      </div>

      {filteredShops.length === 0 ? (
        <p className="text-caption text-text-secondary py-2">
          {shops.length === 0
            ? "아직 등록된 업체가 없어요. 아래에서 첫 업체를 등록해 보세요."
            : "선택한 상태에 해당하는 업체가 없어요."}
        </p>
      ) : (
        <div className="flex items-stretch gap-3 overflow-x-auto pb-1">
          {filteredShops.map((shop) => {
            const cover =
              shop.images.find((img) => img.is_cover) ?? shop.images[0] ?? null;
            const isSelected = selectedShopId === shop.id;

            return (
              <button
                key={shop.id}
                type="button"
                onClick={() => onSelectShop(shop)}
                className={`min-h-[64px] min-w-[220px] max-w-[270px] shrink-0 p-2.5 rounded-2xl border text-left flex items-center gap-3 transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-accent-gold-tint/70 border-accent-gold"
                    : "bg-surface border-border hover:bg-surface-subtle"
                }`}
              >
                <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-surface-subtle shrink-0 border border-border">
                  {cover ? (
                    <Image
                      src={cover.public_url}
                      alt={shop.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-caption text-text-secondary">
                      사진
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-caption font-semibold shrink-0 ${
                        shop.status === "finalist"
                          ? "bg-accent-sage-tint text-accent-sage-text"
                          : shop.status === "excluded"
                            ? "bg-accent-rose-tint text-accent-rose-text"
                            : "bg-surface-subtle text-text-secondary"
                      }`}
                    >
                      {SHOP_STATUS_LABELS[shop.status]}
                    </span>
                    <span className="text-caption text-text-secondary truncate">
                      사진 {shop.images.length}
                    </span>
                  </div>
                  <p className="text-control text-text-primary truncate mt-0.5">
                    {shop.name}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
