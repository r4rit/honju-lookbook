"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Info } from "lucide-react";
import { SERVICE_TYPE_LABELS, type ShopDetailDTO } from "@/types/shop";

interface ShopInfoCardProps {
  shop: ShopDetailDTO;
}

export function ShopInfoCard({ shop }: ShopInfoCardProps) {
  const [copiedAddress, setCopiedAddress] = useState(false);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const showCopiedToast = () => {
    setCopiedAddress(true);
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = window.setTimeout(() => {
      setCopiedAddress(false);
      copyTimerRef.current = null;
    }, 2500);
  };

  const handleCopyAddress = async () => {
    if (!shop.address) return;
    try {
      await navigator.clipboard.writeText(shop.address);
      showCopiedToast();
    } catch {
      const el = document.createElement("textarea");
      el.value = shop.address;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      showCopiedToast();
    }
  };

  const infoRows: Array<{ label: string; value: string; isAddress?: boolean }> =
    [
      { label: "예상 가격", value: shop.price_summary },
      { label: "식장 거리·이동", value: shop.venue_distance_note },
      { label: "진행 방식", value: SERVICE_TYPE_LABELS[shop.service_type] },
      { label: "주차 안내", value: shop.parking_info },
      { label: "영업시간", value: shop.business_hours },
      { label: "주소", value: shop.address, isAddress: true },
    ].filter((row) => row.value.trim().length > 0);

  return (
    <div className="space-y-5">
      {shop.summary_note && (
        <div className="rounded-2xl bg-accent-gold-tint border border-accent-gold/35 p-4 md:p-5">
          <p className="text-caption text-accent-gold-text font-semibold flex items-center gap-1.5 mb-1.5">
            <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>한눈에 보는 추천 메모</span>
          </p>
          <p className="text-body text-text-primary leading-relaxed">
            {shop.summary_note}
          </p>
        </div>
      )}

      <section className="rounded-2xl border border-border bg-surface p-5 space-y-4">
        <h2 className="font-serif text-section-title text-text-primary">
          기본 정보
        </h2>

        <dl className="divide-y divide-border">
          {infoRows.map((row) => (
            <div
              key={row.label}
              className="py-3.5 first:pt-0 last:pb-0 flex flex-col gap-1"
            >
              <dt className="text-caption text-text-secondary">{row.label}</dt>
              <dd className="text-body text-text-primary flex flex-wrap items-center justify-between gap-2">
                <span
                  className={
                    row.label === "예상 가격" ? "text-body-strong" : "text-body"
                  }
                >
                  {row.value}
                </span>
                {row.isAddress && (
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className={`min-h-[48px] px-3.5 py-2 rounded-xl border text-control inline-flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                      copiedAddress
                        ? "bg-accent-sage-tint border-accent-sage text-accent-sage-text"
                        : "bg-surface-subtle border-border-strong text-text-primary hover:bg-border/40"
                    }`}
                  >
                    {copiedAddress ? (
                      <>
                        <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>복사 완료!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>주소 복사</span>
                      </>
                    )}
                  </button>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {(shop.pros || shop.cons) && (
        <section className="grid grid-cols-1 gap-3">
          {shop.pros && (
            <div className="rounded-2xl bg-accent-sage-tint/75 border border-accent-sage/30 p-4 md:p-5">
              <h3 className="text-body-strong text-accent-sage-text mb-1.5">
                좋은 점
              </h3>
              <p className="text-body text-text-primary whitespace-pre-wrap">
                {shop.pros}
              </p>
            </div>
          )}

          {shop.cons && (
            <div className="rounded-2xl bg-surface-subtle border border-border p-4 md:p-5">
              <h3 className="text-body-strong text-text-primary mb-1.5">
                참고 및 주의할 점
              </h3>
              <p className="text-body text-text-secondary whitespace-pre-wrap">
                {shop.cons}
              </p>
            </div>
          )}
        </section>
      )}

      {copiedAddress && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-[calc(92px+env(safe-area-inset-bottom))] md:bottom-8 left-1/2 -translate-x-1/2 z-40 px-5 py-3 rounded-full bg-text-primary text-surface text-control shadow-lg inline-flex items-center gap-2 whitespace-nowrap pointer-events-none"
        >
          <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>주소가 복사되었어요</span>
        </div>
      )}
    </div>
  );
}
