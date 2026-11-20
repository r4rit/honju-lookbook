"use client";

import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalErrorPage({ reset }: ErrorPageProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <PublicHeader />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="editorial-card rounded-3xl p-8 max-w-[460px] w-full text-center space-y-4">
          <h1 className="font-serif text-section-title text-text-primary">
            화면을 불러오는 중 잠시 문제가 생겼어요
          </h1>
          <p className="text-body text-text-secondary">
            인터넷 연결을 확인하시거나 아래 다시 시도 버튼을 눌러 주세요.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={reset}
              className="min-h-[48px] px-5 py-2.5 rounded-2xl bg-text-primary text-surface text-control inline-flex items-center justify-center gap-2 hover:bg-text-primary/90 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>다시 시도하기</span>
            </button>
            <Link
              href="/"
              className="min-h-[48px] px-5 py-2.5 rounded-2xl border border-border-strong bg-surface text-control text-text-primary inline-flex items-center justify-center gap-2 hover:bg-surface-subtle"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>처음 화면으로</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
