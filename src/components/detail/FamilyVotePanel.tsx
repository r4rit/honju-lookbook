"use client";

import { Heart } from "lucide-react";
import type { FamilyRole } from "@/types/shop";

interface FamilyVotePanelProps {
  voters: FamilyRole[];
  currentRole: FamilyRole | null;
  isVoting: boolean;
  errorMsg: string | null;
  onToggleVote: () => void;
}

function formatVotersSentence(voters: FamilyRole[]): string {
  if (voters.length === 0) {
    return "아직 하트를 누른 가족이 없어요. 첫 번째로 표시해 보세요.";
  }
  return `${voters.join(", ")}님이 좋아해요`;
}

export function FamilyVotePanel({
  voters,
  currentRole,
  isVoting,
  errorMsg,
  onToggleVote,
}: FamilyVotePanelProps) {
  const hasVoted = currentRole !== null && voters.includes(currentRole);

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 space-y-3.5">
      <button
        type="button"
        onClick={onToggleVote}
        disabled={isVoting}
        aria-pressed={hasVoted}
        className={`w-full min-h-[56px] px-5 py-3 rounded-2xl border text-body-strong inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-70 ${
          hasVoted
            ? "bg-accent-rose-fill border-accent-rose-fill text-surface"
            : "bg-accent-rose-tint border-accent-rose text-accent-rose-text hover:bg-accent-rose/15"
        }`}
      >
        <Heart
          className={`w-5 h-5 shrink-0 ${hasVoted ? "fill-current" : ""}`}
          aria-hidden="true"
        />
        <span>
          {hasVoted ? "마음에 들어요 선택됨" : "여기 마음에 들어요"} (
          {voters.length})
        </span>
      </button>

      <p className="text-body text-text-secondary">
        {formatVotersSentence(voters)}
      </p>

      {voters.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {voters.map((voter) => (
            <span
              key={voter}
              className={`px-3 py-1 rounded-full text-caption font-semibold ${
                voter === currentRole
                  ? "bg-accent-rose-tint border border-accent-rose/40 text-accent-rose-text"
                  : "bg-surface-subtle text-text-primary"
              }`}
            >
              ♥ {voter}
            </span>
          ))}
        </div>
      )}

      {errorMsg && (
        <p role="alert" className="text-caption text-danger">
          {errorMsg}
        </p>
      )}
    </section>
  );
}
