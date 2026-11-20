"use client";

import { useFontScale } from "@/components/providers/FontScaleProvider";

export function FontScaleToggle() {
  const { scale, setScale } = useFontScale();

  return (
    <div
      role="group"
      aria-label="글자 크기 조절"
      className="inline-flex max-w-full items-center rounded-full border border-border-strong bg-surface p-0.5 shadow-[0_1px_3px_rgba(31,29,26,0.04)]"
    >
      <button
        type="button"
        onClick={() => setScale("normal")}
        aria-pressed={scale === "normal"}
        className={`min-h-[48px] px-3 py-1.5 rounded-full text-control whitespace-nowrap transition-colors cursor-pointer ${
          scale === "normal"
            ? "bg-accent-gold-tint text-accent-gold-text border border-accent-gold/50"
            : "text-text-secondary hover:text-text-primary border border-transparent"
        }`}
      >
        가 보통
      </button>
      <button
        type="button"
        onClick={() => setScale("large")}
        aria-pressed={scale === "large"}
        className={`min-h-[48px] px-3 py-1.5 rounded-full text-control whitespace-nowrap transition-colors cursor-pointer ${
          scale === "large"
            ? "bg-accent-gold-tint text-accent-gold-text border border-accent-gold/50"
            : "text-text-secondary hover:text-text-primary border border-transparent"
        }`}
      >
        가+ 크게
      </button>
    </div>
  );
}
