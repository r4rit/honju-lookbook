"use client";

import Link from "next/link";
import { useCallback, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Loader2, Lock } from "lucide-react";

interface AdminPinGateProps {
  onAuthenticated: () => void;
  initialMessage?: string | null;
}

export function AdminPinGate({
  onAuthenticated,
  initialMessage = null,
}: AdminPinGateProps) {
  const [pin, setPin] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(initialMessage);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);

  const submitPin = useCallback(
    async (candidatePin: string) => {
      if (isSubmittingRef.current) return;
      if (!/^\d{4}$/.test(candidatePin)) {
        setErrorMsg("4자리 숫자 비밀번호를 입력해 주세요.");
        setShakeKey((k) => k + 1);
        return;
      }

      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setErrorMsg(null);

      try {
        const res = await fetch("/api/admin/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: candidatePin }),
        });

        if (res.ok) {
          onAuthenticated();
          return;
        }

        const data = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;

        setErrorMsg(
          data?.error?.message ?? "비밀번호가 일치하지 않습니다."
        );
        setShakeKey((k) => k + 1);
        setPin("");
        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
      } catch {
        setErrorMsg("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
        setShakeKey((k) => k + 1);
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [onAuthenticated]
  );

  const handlePinChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 4);
    setPin(digitsOnly);
    if (errorMsg) {
      setErrorMsg(null);
    }
    if (digitsOnly.length === 4) {
      void submitPin(digitsOnly);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitPin(pin);
  };

  return (
    <div className="min-h-[100dvh] bg-canvas-mobile md:bg-canvas-desktop px-4 py-8 flex items-center justify-center">
      <div
        key={shakeKey}
        className={`w-full max-w-[420px] editorial-card rounded-3xl p-6 md:p-8 ${
          shakeKey > 0 ? "animate-pin-shake" : ""
        }`}
      >
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-accent-gold-tint border border-accent-gold/40 flex items-center justify-center text-accent-gold-text mb-4">
            <Lock className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="font-serif text-page-title text-text-primary">
            관리자 스튜디오
          </h1>
          <p className="text-body text-text-secondary mt-1.5">
            4자리 비밀번호를 입력해 주세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="admin-pin-input"
              className="block text-caption text-text-secondary mb-2 text-center"
            >
              관리자 PIN 4자리
            </label>
            <input
              ref={inputRef}
              id="admin-pin-input"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              autoComplete="one-time-code"
              autoFocus
              disabled={isSubmitting}
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              placeholder="••••"
              style={{ fontSize: "28px" }}
              className="w-full min-h-[64px] px-4 rounded-2xl border border-border-strong bg-surface text-center tracking-[0.55em] font-bold text-text-primary focus:outline-none focus:border-accent-gold focus:ring-2 focus:ring-accent-gold/25 disabled:opacity-60"
            />
          </div>

          {errorMsg && (
            <p
              role="alert"
              className="text-caption text-danger bg-accent-rose-tint border border-accent-rose/30 rounded-xl px-4 py-3 text-center"
            >
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || pin.length < 4}
            className="w-full min-h-[52px] px-5 py-3 rounded-2xl bg-text-primary text-surface text-control inline-flex items-center justify-center gap-2 hover:bg-text-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                <span>확인 중...</span>
              </>
            ) : (
              <span>관리자 입장하기</span>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-border flex justify-center">
          <Link
            href="/"
            className="min-h-[48px] px-4 py-2 rounded-xl inline-flex items-center gap-1.5 text-control text-text-secondary hover:text-text-primary hover:bg-surface-subtle transition-colors"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>룩북으로 돌아가기</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
