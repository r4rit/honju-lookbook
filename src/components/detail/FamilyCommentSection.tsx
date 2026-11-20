"use client";

import { useState, type FormEvent } from "react";
import { Loader2, MessageCircle, Send, Trash2, User } from "lucide-react";
import { useFamilyIdentity } from "@/components/providers/FamilyIdentityProvider";
import type { FamilyRole, ShopCommentDTO } from "@/types/shop";

interface FamilyCommentSectionProps {
  shopId: string;
  initialComments: ShopCommentDTO[];
  isAdmin: boolean;
}

function formatKoreanTimestamp(isoString: string): string {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(isoString));
  } catch {
    return "";
  }
}

export function FamilyCommentSection({
  shopId,
  initialComments,
  isAdmin,
}: FamilyCommentSectionProps) {
  const { role, openModal, requireRole } = useFamilyIdentity();

  const [comments, setComments] = useState<ShopCommentDTO[]>(initialComments);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const submitCommentForRole = async (
    authorRole: FamilyRole,
    trimmedContent: string
  ) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/shops/${shopId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          family_role: authorRole,
          content: trimmedContent,
        }),
      });

      const data = (await res.json().catch(() => null)) as {
        comment?: ShopCommentDTO;
        error?: { message?: string };
      } | null;

      if (!res.ok || !data?.comment) {
        setErrorMsg(
          data?.error?.message ?? "의견을 등록하지 못했습니다. 다시 시도해 주세요."
        );
        return;
      }

      setComments((prev) => [...prev, data.comment as ShopCommentDTO]);
      setContent("");
    } catch {
      setErrorMsg("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = content.trim();
    if (trimmed.length === 0 || isSubmitting) {
      setErrorMsg("남기실 의견을 입력해 주세요.");
      return;
    }

    requireRole((selectedRole) => {
      void submitCommentForRole(selectedRole, trimmed);
    });
  };

  const handleDeleteComment = async (commentId: string) => {
    if (deletingId) return;

    setDeletingId(commentId);
    setErrorMsg(null);

    try {
      const query = role
        ? `?family_role=${encodeURIComponent(role)}`
        : "";
      const res = await fetch(
        `/api/shops/${shopId}/comments/${commentId}${query}`,
        { method: "DELETE" }
      );

      const data = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;

      if (!res.ok) {
        setErrorMsg(
          data?.error?.message ?? "의견을 삭제하지 못했습니다."
        );
        setConfirmDeleteId(null);
        return;
      }

      setComments((prev) => prev.filter((item) => item.id !== commentId));
      setConfirmDeleteId(null);
    } catch {
      setErrorMsg("삭제 중 네트워크 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-serif text-section-title text-text-primary flex items-center gap-2">
          <MessageCircle
            className="w-5 h-5 text-accent-gold-text shrink-0"
            aria-hidden="true"
          />
          <span>가족 의견 ({comments.length})</span>
        </h2>
      </div>

      {comments.length === 0 ? (
        <div className="rounded-2xl bg-surface-subtle p-5 text-center">
          <p className="text-body text-text-secondary">
            아직 남겨진 가족 의견이 없어요. 첫 의견을 남겨 보세요.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => {
            const canDelete = isAdmin || (role !== null && comment.family_role === role);
            const isConfirming = confirmDeleteId === comment.id;
            const isDeletingThis = deletingId === comment.id;

            return (
              <li
                key={comment.id}
                className="rounded-2xl bg-surface-subtle border border-border p-4 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-accent-gold-tint border border-accent-gold/35 text-accent-gold-text text-caption font-semibold">
                      {comment.family_role}
                    </span>
                    <span className="text-caption text-text-secondary">
                      {formatKoreanTimestamp(comment.created_at)}
                    </span>
                  </div>

                  {canDelete && !isConfirming && (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(comment.id)}
                      className="min-h-[48px] px-3 py-1.5 rounded-xl text-caption text-text-secondary hover:text-danger hover:bg-accent-rose-tint inline-flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>삭제</span>
                    </button>
                  )}
                </div>

                <p className="text-body text-text-primary whitespace-pre-wrap">
                  {comment.content}
                </p>

                {isConfirming && (
                  <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2">
                    <span className="text-caption text-danger">
                      이 의견을 삭제할까요?
                    </span>
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        disabled={isDeletingThis}
                        onClick={() => setConfirmDeleteId(null)}
                        className="min-h-[48px] px-3.5 py-2 rounded-xl border border-border-strong bg-surface text-control text-text-primary cursor-pointer"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        disabled={isDeletingThis}
                        onClick={() => handleDeleteComment(comment.id)}
                        className="min-h-[48px] px-3.5 py-2 rounded-xl bg-danger text-surface text-control inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        {isDeletingThis && (
                          <Loader2
                            className="w-4 h-4 animate-spin"
                            aria-hidden="true"
                          />
                        )}
                        <span>삭제 확인</span>
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 pt-2 border-t border-border">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-caption text-text-secondary inline-flex items-center gap-1.5">
            <User className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              작성자:{" "}
              <strong className="text-text-primary">
                {role ?? "역할을 아직 선택하지 않으셨어요"}
              </strong>
            </span>
          </span>

          <button
            type="button"
            onClick={openModal}
            className="min-h-[48px] px-3.5 py-2 rounded-xl border border-border-strong bg-surface-subtle text-control text-text-primary hover:bg-border/40 cursor-pointer"
          >
            {role ? "역할 변경" : "가족 역할 선택"}
          </button>
        </div>

        <textarea
          rows={3}
          maxLength={500}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            if (errorMsg) setErrorMsg(null);
          }}
          placeholder="예: 올림머리 볼륨이 과하지 않고 단아하네요."
          className="w-full min-h-[108px] p-4 rounded-2xl border border-border-strong bg-surface text-body text-text-primary placeholder:text-text-secondary/65 focus:outline-none focus:border-accent-gold focus:ring-2 focus:ring-accent-gold/20 resize-y"
        />

        {errorMsg && (
          <p role="alert" className="text-caption text-danger">
            {errorMsg}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-caption text-text-secondary">
            {content.trim().length} / 500자
          </span>

          <button
            type="submit"
            disabled={isSubmitting || content.trim().length === 0}
            className="min-h-[52px] px-6 py-2.5 rounded-2xl bg-text-primary text-surface text-control inline-flex items-center justify-center gap-2 hover:bg-text-primary/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
                <span>등록 중...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>의견 등록하기</span>
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
