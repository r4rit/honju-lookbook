"use client";

import { useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import {
  SERVICE_TYPES,
  SERVICE_TYPE_LABELS,
  SHOP_STATUSES,
  SHOP_STATUS_LABELS,
} from "@/types/shop";
import type { AdminShopFormState } from "@/components/admin/types";

interface AdminShopFormProps {
  form: AdminShopFormState;
  fieldErrors: Record<string, string[]>;
  onChange: <K extends keyof AdminShopFormState>(
    key: K,
    value: AdminShopFormState[K]
  ) => void;
}

const MAX_HIGHLIGHT_TAGS = 5;

const inputBaseClass =
  "w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-border-strong bg-surface text-body text-text-primary placeholder:text-text-secondary/65 focus:outline-none focus:border-accent-gold focus:ring-2 focus:ring-accent-gold/20";

const textareaBaseClass =
  "w-full min-h-[104px] p-4 rounded-xl border border-border-strong bg-surface text-body text-text-primary placeholder:text-text-secondary/65 focus:outline-none focus:border-accent-gold focus:ring-2 focus:ring-accent-gold/20 resize-y";

export function AdminShopForm({
  form,
  fieldErrors,
  onChange,
}: AdminShopFormProps) {
  const [tagInput, setTagInput] = useState("");
  const [tagHint, setTagHint] = useState<string | null>(null);

  const addTagsFromText = (rawValue: string) => {
    const candidates = rawValue
      .split(",")
      .map((part) => part.trim().replace(/^#+/, "").trim())
      .filter((part) => part.length > 0);

    if (candidates.length === 0) return;

    const next = [...form.highlights];
    let skippedLimit = false;
    let skippedLength = false;

    for (const candidate of candidates) {
      if (candidate.length > 20) {
        skippedLength = true;
        continue;
      }
      if (next.includes(candidate)) {
        continue;
      }
      if (next.length >= MAX_HIGHLIGHT_TAGS) {
        skippedLimit = true;
        break;
      }
      next.push(candidate);
    }

    onChange("highlights", next);
    setTagInput("");

    if (skippedLimit) {
      setTagHint(`핵심 특징 태그는 최대 ${MAX_HIGHLIGHT_TAGS}개까지 넣을 수 있어요.`);
    } else if (skippedLength) {
      setTagHint("태그는 한 개당 20자 이내로 입력해 주세요.");
    } else {
      setTagHint(null);
    }
  };

  const handleTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTagsFromText(tagInput);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTagHint(null);
    onChange(
      "highlights",
      form.highlights.filter((tag) => tag !== tagToRemove)
    );
  };

  const getFieldError = (field: string): string | undefined =>
    fieldErrors[field]?.[0];

  return (
    <section className="editorial-card rounded-2xl p-5 md:p-6 space-y-6">
      <div>
        <h2 className="text-section-title text-text-primary">
          2. 업체 상세 정보 입력
        </h2>
        <p className="text-caption text-text-secondary mt-1">
          AI가 채운 내용을 확인하고 식장 거리나 부모님용 메모를 자유롭게 다듬어 주세요.
        </p>
      </div>

      {/* 후보 상태 */}
      <div>
        <span className="block text-control text-text-primary mb-2">
          후보 상태
        </span>
        <div className="grid grid-cols-3 gap-2">
          {SHOP_STATUSES.map((statusOption) => {
            const active = form.status === statusOption;
            return (
              <button
                key={statusOption}
                type="button"
                onClick={() => onChange("status", statusOption)}
                aria-pressed={active}
                className={`min-h-[48px] px-3 py-2 rounded-xl border text-control transition-colors cursor-pointer ${
                  active
                    ? statusOption === "finalist"
                      ? "bg-accent-sage-tint border-accent-sage text-accent-sage-text"
                      : statusOption === "excluded"
                        ? "bg-accent-rose-tint border-accent-rose text-accent-rose-text"
                        : "bg-accent-gold-tint border-accent-gold text-accent-gold-text"
                    : "bg-surface border-border-strong text-text-secondary hover:bg-surface-subtle"
                }`}
              >
                {SHOP_STATUS_LABELS[statusOption]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 업체명 & 지역 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="shop-name"
            className="block text-control text-text-primary mb-1.5"
          >
            업체명 <span className="text-danger">*</span>
          </label>
          <input
            id="shop-name"
            type="text"
            maxLength={120}
            value={form.name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="예: 청담 아뜰리에 메이크업"
            className={inputBaseClass}
          />
          {getFieldError("name") && (
            <p role="alert" className="text-caption text-danger mt-1.5">
              {getFieldError("name")}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="shop-region"
            className="block text-control text-text-primary mb-1.5"
          >
            지역
          </label>
          <input
            id="shop-region"
            type="text"
            maxLength={60}
            value={form.region}
            onChange={(e) => onChange("region", e.target.value)}
            placeholder="예: 강남·청담"
            className={inputBaseClass}
          />
        </div>
      </div>

      {/* 도로명 주소 & 식장 거리 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="shop-address"
            className="block text-control text-text-primary mb-1.5"
          >
            도로명 주소
          </label>
          <input
            id="shop-address"
            type="text"
            maxLength={240}
            value={form.address}
            onChange={(e) => onChange("address", e.target.value)}
            placeholder="예: 서울 강남구 선릉로 123 3층"
            className={inputBaseClass}
          />
        </div>

        <div>
          <label
            htmlFor="shop-distance"
            className="block text-control text-text-primary mb-1.5"
          >
            식장과의 거리/소요시간 메모
          </label>
          <input
            id="shop-distance"
            type="text"
            maxLength={160}
            value={form.venue_distance_note}
            onChange={(e) => onChange("venue_distance_note", e.target.value)}
            placeholder="예: 식장까지 차로 약 15분"
            className={inputBaseClass}
          />
        </div>
      </div>

      {/* 가격 요약 */}
      <div>
        <label
          htmlFor="shop-price"
          className="block text-control text-text-primary mb-1.5"
        >
          가격 요약
        </label>
        <input
          id="shop-price"
          type="text"
          maxLength={160}
          value={form.price_summary}
          onChange={(e) => onChange("price_summary", e.target.value)}
          placeholder="예: 혼주 1인 22~25만원 (헤어+메이크업 포함)"
          className={inputBaseClass}
        />
      </div>

      {/* 진행 방식 */}
      <div>
        <span className="block text-control text-text-primary mb-2">
          진행 방식
        </span>
        <div className="grid grid-cols-3 gap-2">
          {SERVICE_TYPES.map((typeOption) => {
            const active = form.service_type === typeOption;
            return (
              <button
                key={typeOption}
                type="button"
                onClick={() => onChange("service_type", typeOption)}
                aria-pressed={active}
                className={`min-h-[48px] px-3 py-2 rounded-xl border text-control transition-colors cursor-pointer ${
                  active
                    ? "bg-accent-gold-tint border-accent-gold text-accent-gold-text"
                    : "bg-surface border-border-strong text-text-secondary hover:bg-surface-subtle"
                }`}
              >
                {SERVICE_TYPE_LABELS[typeOption]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 주차 안내 & 영업시간 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="shop-parking"
            className="block text-control text-text-primary mb-1.5"
          >
            주차 안내
          </label>
          <input
            id="shop-parking"
            type="text"
            maxLength={240}
            value={form.parking_info}
            onChange={(e) => onChange("parking_info", e.target.value)}
            placeholder="예: 발렛파킹 5,000원 (2시간 무료)"
            className={inputBaseClass}
          />
        </div>

        <div>
          <label
            htmlFor="shop-hours"
            className="block text-control text-text-primary mb-1.5"
          >
            영업시간
          </label>
          <input
            id="shop-hours"
            type="text"
            maxLength={200}
            value={form.business_hours}
            onChange={(e) => onChange("business_hours", e.target.value)}
            placeholder="예: 매일 05:00 - 18:00 (새벽 예약 가능)"
            className={inputBaseClass}
          />
        </div>
      </div>

      {/* 핵심 특징 태그 */}
      <div>
        <label
          htmlFor="shop-tag-input"
          className="block text-control text-text-primary mb-1.5"
        >
          핵심 특징 태그 ({form.highlights.length}/{MAX_HIGHLIGHT_TAGS}개)
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="shop-tag-input"
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            disabled={form.highlights.length >= MAX_HIGHLIGHT_TAGS}
            placeholder="특징 입력 후 Enter 또는 쉼표 (예: 한복올림머리)"
            className={`${inputBaseClass} flex-1 disabled:opacity-60`}
          />
          <button
            type="button"
            onClick={() => addTagsFromText(tagInput)}
            disabled={
              form.highlights.length >= MAX_HIGHLIGHT_TAGS ||
              tagInput.trim().length === 0
            }
            className="min-h-[48px] px-4 py-2 rounded-xl border border-border-strong bg-surface-subtle text-control text-text-primary inline-flex items-center justify-center gap-1.5 hover:bg-border/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>태그 추가</span>
          </button>
        </div>

        {tagHint && (
          <p className="text-caption text-accent-gold-text mt-1.5">{tagHint}</p>
        )}

        {form.highlights.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {form.highlights.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="min-h-[48px] px-3.5 py-2 rounded-full bg-accent-gold-tint border border-accent-gold/50 text-accent-gold-text text-control inline-flex items-center gap-1.5 hover:bg-accent-rose-tint hover:border-accent-rose/40 hover:text-danger transition-colors cursor-pointer"
              >
                <span>#{tag}</span>
                <span className="text-caption">삭제</span>
                <X className="w-4 h-4 shrink-0" aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 장점 / 주의점 / 부모님용 추천 메모 */}
      <div className="space-y-4">
        <div>
          <label
            htmlFor="shop-pros"
            className="block text-control text-text-primary mb-1.5"
          >
            장점
          </label>
          <textarea
            id="shop-pros"
            rows={3}
            maxLength={1000}
            value={form.pros}
            onChange={(e) => onChange("pros", e.target.value)}
            placeholder="어머님·아버님 입장에서 좋은 점을 적어 주세요."
            className={textareaBaseClass}
          />
        </div>

        <div>
          <label
            htmlFor="shop-cons"
            className="block text-control text-text-primary mb-1.5"
          >
            주의점 (단점 / 확인 필요 사항)
          </label>
          <textarea
            id="shop-cons"
            rows={2}
            maxLength={1000}
            value={form.cons}
            onChange={(e) => onChange("cons", e.target.value)}
            placeholder="예약 마감 속도, 추가 비용 등 미리 참고할 점을 적어 주세요."
            className={textareaBaseClass}
          />
        </div>

        <div>
          <label
            htmlFor="shop-summary"
            className="block text-control text-text-primary mb-1.5"
          >
            부모님용 추천 메모
          </label>
          <textarea
            id="shop-summary"
            rows={2}
            maxLength={1000}
            value={form.summary_note}
            onChange={(e) => onChange("summary_note", e.target.value)}
            placeholder="부모님이 한눈에 이해하시기 좋은 따뜻한 요약 문장을 적어 주세요."
            className={textareaBaseClass}
          />
        </div>
      </div>

      {/* 외부 링크 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
        <div>
          <label
            htmlFor="shop-naver-url"
            className="block text-control text-text-primary mb-1.5"
          >
            네이버 지도 링크
          </label>
          <input
            id="shop-naver-url"
            type="url"
            value={form.naver_map_url}
            onChange={(e) => onChange("naver_map_url", e.target.value)}
            placeholder="https://naver.me/..."
            className={inputBaseClass}
          />
          {getFieldError("naver_map_url") && (
            <p role="alert" className="text-caption text-danger mt-1.5">
              {getFieldError("naver_map_url")}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="shop-instagram-url"
            className="block text-control text-text-primary mb-1.5"
          >
            인스타그램 링크
          </label>
          <input
            id="shop-instagram-url"
            type="url"
            value={form.instagram_url}
            onChange={(e) => onChange("instagram_url", e.target.value)}
            placeholder="https://www.instagram.com/..."
            className={inputBaseClass}
          />
          {getFieldError("instagram_url") && (
            <p role="alert" className="text-caption text-danger mt-1.5">
              {getFieldError("instagram_url")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
