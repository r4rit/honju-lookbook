import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";

export default function ShopNotFoundPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <PublicHeader backHref="/" backLabel="목록" />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="editorial-card rounded-3xl p-8 max-w-[460px] w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-accent-gold-tint border border-accent-gold/40 text-accent-gold-text mx-auto flex items-center justify-center">
            <SearchX className="w-7 h-7" aria-hidden="true" />
          </div>
          <h1 className="font-serif text-section-title text-text-primary">
            해당 업체를 찾을 수 없어요
          </h1>
          <p className="text-body text-text-secondary">
            삭제되었거나 후보 목록에서 제외된 업체일 수 있습니다. 전체 목록에서 다른 후보를 살펴보세요.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="min-h-[48px] px-6 py-3 rounded-2xl bg-text-primary text-surface text-control inline-flex items-center justify-center gap-2 hover:bg-text-primary/90 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>전체 목록으로 돌아가기</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
