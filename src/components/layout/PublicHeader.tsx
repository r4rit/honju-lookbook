"use client";

import Link from "next/link";
import { ArrowLeft, ChevronDown, User } from "lucide-react";
import { FontScaleToggle } from "@/components/layout/FontScaleToggle";
import { useFamilyIdentity } from "@/components/providers/FamilyIdentityProvider";

interface PublicHeaderProps {
  backHref?: string;
  backLabel?: string;
  pageTitle?: string;
}

export function PublicHeader({
  backHref,
  backLabel = "목록",
  pageTitle,
}: PublicHeaderProps) {
  const { role, openModal } = useFamilyIdentity();

  return (
    <header className="sticky top-0 z-30 safe-top bg-canvas-mobile/95 backdrop-blur-md border-b border-border">
      <div className="max-w-[960px] xl:max-w-[1120px] mx-auto px-4 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {backHref ? (
            <Link
              href={backHref}
              className="min-h-[48px] px-3 py-2 -ml-2 inline-flex items-center gap-1.5 rounded-xl text-control text-text-primary hover:bg-surface-subtle transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{backLabel}</span>
            </Link>
          ) : (
            <Link
              href="/"
              className="inline-flex items-baseline gap-2.5 min-h-[48px] py-1.5"
            >
              <span className="font-serif text-card-title md:text-page-title text-text-primary tracking-tight">
                혼주 룩북
              </span>
              <span className="hidden md:inline text-caption text-text-secondary font-normal">
                양가 어머님·가족을 위한 메이크업 정리
              </span>
            </Link>
          )}
          {backHref && pageTitle && (
            <span className="text-body-strong text-text-primary truncate md:hidden">
              {pageTitle}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 ml-auto max-w-full">
          <button
            type="button"
            onClick={openModal}
            className={`min-h-[48px] max-w-full px-3.5 py-2 rounded-full border text-control inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              role
                ? "bg-surface border-border-strong text-text-primary hover:bg-surface-subtle"
                : "bg-accent-gold-tint border-accent-gold text-accent-gold-text hover:bg-accent-gold/15"
            }`}
          >
            <User className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="truncate max-w-[180px]">{role ?? "누구신가요?"}</span>
            <ChevronDown className="w-4 h-4 shrink-0" aria-hidden="true" />
          </button>

          <FontScaleToggle />

          <Link
            href="/admin"
            className="hidden md:inline-flex min-h-[48px] items-center px-3 py-2 rounded-xl text-control text-text-secondary hover:text-text-primary hover:bg-surface-subtle transition-colors whitespace-nowrap"
          >
            관리자
          </Link>
        </div>
      </div>
    </header>
  );
}
