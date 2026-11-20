"use client";

import { useEffect } from "react";
import { Check, X } from "lucide-react";
import { useFamilyIdentity } from "@/components/providers/FamilyIdentityProvider";
import { FAMILY_ROLES } from "@/types/shop";

export function FamilyIdentityModal() {
  const { role, isModalOpen, closeModal, selectRole, clearRole } =
    useFamilyIdentity();

  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, closeModal]);

  if (!isModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-[#1F1D1A]/45 backdrop-blur-[2px] overscroll-contain"
      onClick={closeModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="family-identity-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-[460px] bg-surface rounded-t-3xl md:rounded-3xl border border-border shadow-xl px-5 pt-6 pb-6 safe-bottom overscroll-contain"
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h2
              id="family-identity-modal-title"
              className="font-serif text-section-title text-text-primary"
            >
              가족 중 누구신가요?
            </h2>
            <p className="text-caption text-text-secondary mt-1">
              한 번만 선택하시면 찜하기와 의견 남기기가 바로 돼요.
            </p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            aria-label="선택 창 닫기"
            className="min-h-[48px] min-w-[48px] px-3 inline-flex items-center justify-center gap-1 rounded-xl border border-border bg-surface-subtle text-control text-text-secondary hover:text-text-primary cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>닫기</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mt-5">
          {FAMILY_ROLES.map((item) => {
            const isSelected = role === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => selectRole(item)}
                className={`min-h-[52px] px-3.5 py-2.5 rounded-2xl border text-control flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-accent-gold-tint border-accent-gold text-accent-gold-text"
                    : "bg-surface border-border-strong text-text-primary hover:bg-surface-subtle"
                }`}
              >
                {isSelected && (
                  <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
                )}
                <span>{item}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 pt-4 border-t border-border">
          {role ? (
            <button
              type="button"
              onClick={clearRole}
              className="min-h-[48px] px-4 py-2 rounded-xl border border-border-strong text-control text-text-secondary hover:bg-surface-subtle cursor-pointer"
            >
              선택 해제
            </button>
          ) : (
            <span className="text-caption text-text-secondary">
              언제든지 위 버튼에서 바꿀 수 있어요
            </span>
          )}
          <button
            type="button"
            onClick={closeModal}
            className="min-h-[48px] px-5 py-2 rounded-xl bg-surface-subtle border border-border text-control text-text-primary hover:bg-border/40 cursor-pointer ml-auto"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
