"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import type { ParsedShopDraftDTO } from "@/types/shop";

interface AiTextParserBoxProps {
  rawText: string;
  onRawTextChange: (next: string) => void;
  onParsed: (draft: ParsedShopDraftDTO) => void;
  onUnauthorized: () => void;
}

export function AiTextParserBox({
  rawText,
  onRawTextChange,
  onParsed,
  onUnauthorized,
}: AiTextParserBoxProps) {
  const [isParsing, setIsParsing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const trimmedLength = rawText.trim().length;

  const handleParse = async () => {
    if (trimmedLength < 10 || isParsing) return;

    setIsParsing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/admin/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: rawText }),
      });

      if (res.status === 401) {
        onUnauthorized();
        return;
      }

      const data = (await res.json().catch(() => null)) as {
        parsed?: ParsedShopDraftDTO;
        error?: { message?: string };
      } | null;

      if (!res.ok || !data?.parsed) {
        setErrorMsg(
          data?.error?.message ??
            "AI 자동 정리에 실패했습니다. 잠시 후 다시 시도해 주세요."
        );
        return;
      }

      onParsed(data.parsed);
      setSuccessMsg("AI가 정보를 정리했어요. 내용을 확인 후 보완해 주세요.");
    } catch {
      setErrorMsg("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <section className="editorial-card rounded-2xl p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h2 className="text-section-title text-text-primary flex items-center gap-2">
            <Sparkles
              className="w-5 h-5 text-accent-gold-text shrink-0"
              aria-hidden="true"
            />
            <span>1. 텍스트 붙여넣기 · AI 자동 정리</span>
          </h2>
          <p className="text-caption text-text-secondary mt-1">
            네이버 지도나 인스타그램 설명을 복사해 넣으면 양식에 맞게 자동으로 채워 드려요.
          </p>
        </div>
      </div>

      <textarea
        value={rawText}
        onChange={(e) => {
          onRawTextChange(e.target.value);
          if (errorMsg) setErrorMsg(null);
          if (successMsg) setSuccessMsg(null);
        }}
        rows={6}
        maxLength={15000}
        placeholder="네이버 지도나 인스타그램에서 업체 정보·가격·주차·후기 텍스트를 대충 복사해서 붙여넣으세요."
        className="w-full min-h-[160px] p-4 rounded-2xl border border-border-strong bg-surface text-body text-text-primary placeholder:text-text-secondary/70 focus:outline-none focus:border-accent-gold focus:ring-2 focus:ring-accent-gold/20 resize-y"
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-caption text-text-secondary">
          {trimmedLength.toLocaleString("ko-KR")} / 15,000자 (최소 10자)
        </span>

        <button
          type="button"
          onClick={handleParse}
          disabled={isParsing || trimmedLength < 10}
          className="min-h-[48px] px-5 py-2.5 rounded-2xl bg-accent-gold-tint border border-accent-gold text-accent-gold-text text-control inline-flex items-center justify-center gap-2 hover:bg-accent-gold/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {isParsing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
              <span>AI가 정리하는 중...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>✨ AI 자동 정리</span>
            </>
          )}
        </button>
      </div>

      {successMsg && (
        <div
          role="status"
          className="mt-3 px-4 py-3 rounded-xl bg-accent-sage-tint border border-accent-sage/30 text-accent-sage-text text-caption flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <p
          role="alert"
          className="mt-3 px-4 py-3 rounded-xl bg-accent-rose-tint border border-accent-rose/30 text-danger text-caption"
        >
          {errorMsg}
        </p>
      )}
    </section>
  );
}
