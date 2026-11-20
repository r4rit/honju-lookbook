"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  LogOut,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { AdminGalleryManager } from "@/components/admin/AdminGalleryManager";
import { AdminShopForm } from "@/components/admin/AdminShopForm";
import { AdminShopListBar } from "@/components/admin/AdminShopListBar";
import { AiTextParserBox } from "@/components/admin/AiTextParserBox";
import { ClipboardImageUploader } from "@/components/admin/ClipboardImageUploader";
import {
  createEmptyFormState,
  shopDtoToFormState,
  type AdminDraftImage,
  type AdminShopFormState,
  type PendingUploadTile,
} from "@/components/admin/types";
import type {
  AdminShopDetailDTO,
  ParsedShopDraftDTO,
  ShopStatus,
} from "@/types/shop";

interface AdminWorkbenchProps {
  initialShops: AdminShopDetailDTO[];
  initialError?: string | null;
  onLoggedOut: (message?: string) => void;
}

interface StatusFeedback {
  kind: "success" | "error";
  text: string;
}

export function AdminWorkbench({
  initialShops,
  initialError = null,
  onLoggedOut,
}: AdminWorkbenchProps) {
  const [shops, setShops] = useState<AdminShopDetailDTO[]>(initialShops);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | ShopStatus>("all");

  const [form, setForm] = useState<AdminShopFormState>(createEmptyFormState);
  const [images, setImages] = useState<AdminDraftImage[]>([]);
  const [pendingUploads, setPendingUploads] = useState<PendingUploadTile[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  const [mobileTab, setMobileTab] = useState<"form" | "photos">("form");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [feedback, setFeedback] = useState<StatusFeedback | null>(
    initialError ? { kind: "error", text: initialError } : null
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleUnauthorized = useCallback(() => {
    onLoggedOut("관리자 세션이 만료되었어요. 비밀번호를 다시 입력해 주세요.");
  }, [onLoggedOut]);

  const confirmDiscardIfDirty = (): boolean => {
    if (!isDirty) return true;
    return window.confirm(
      "아직 저장하지 않은 변경 사항이 있어요. 다른 화면으로 이동할까요?"
    );
  };

  const handleStartNewShop = () => {
    if (selectedShopId !== null && !confirmDiscardIfDirty()) return;
    if (selectedShopId === null && isDirty && !confirmDiscardIfDirty()) return;

    setSelectedShopId(null);
    setForm(createEmptyFormState());
    setImages([]);
    setFieldErrors({});
    setFeedback(null);
    setIsDirty(false);
  };

  const handleSelectShop = (shop: AdminShopDetailDTO) => {
    if (selectedShopId === shop.id) return;
    if (!confirmDiscardIfDirty()) return;

    const loaded = shopDtoToFormState(shop);
    setSelectedShopId(shop.id);
    setForm(loaded.form);
    setImages(loaded.images);
    setFieldErrors({});
    setFeedback(null);
    setIsDirty(false);
  };

  const handleFieldChange = <K extends keyof AdminShopFormState>(
    key: K,
    value: AdminShopFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleAiParsed = (draft: ParsedShopDraftDTO) => {
    setForm((prev) => ({
      ...prev,
      name: draft.name || prev.name,
      region: draft.region || prev.region,
      address: draft.address || prev.address,
      price_summary: draft.price_summary || prev.price_summary,
      service_type: draft.service_type,
      parking_info: draft.parking_info || prev.parking_info,
      business_hours: draft.business_hours || prev.business_hours,
      highlights:
        draft.highlights.length > 0 ? draft.highlights : prev.highlights,
      pros: draft.pros || prev.pros,
      cons: draft.cons || prev.cons,
      summary_note: draft.summary_note || prev.summary_note,
      naver_map_url:
        prev.naver_map_url.trim() === "" && draft.detected_naver_map_url
          ? draft.detected_naver_map_url
          : prev.naver_map_url,
      instagram_url:
        prev.instagram_url.trim() === "" && draft.detected_instagram_url
          ? draft.detected_instagram_url
          : prev.instagram_url,
    }));
    setFieldErrors({});
    setIsDirty(true);
  };

  const handleStartUpload = useCallback((tiles: PendingUploadTile[]) => {
    setPendingUploads((prev) => [...prev, ...tiles]);
  }, []);

  const handleFinishUpload = useCallback(
    (
      tempId: string,
      uploaded: AdminDraftImage | null,
      errorMsg?: string
    ) => {
      setPendingUploads((prev) => prev.filter((item) => item.tempId !== tempId));

      if (errorMsg) {
        setFeedback({ kind: "error", text: errorMsg });
      }

      if (!uploaded) return;

      setImages((prev) => {
        const nextItem: AdminDraftImage = {
          ...uploaded,
          is_cover: prev.length === 0 ? true : uploaded.is_cover,
          sort_order: prev.length,
        };
        return [...prev, nextItem];
      });
      setIsDirty(true);
    },
    []
  );

  const handleSetCover = (storagePath: string) => {
    setImages((prev) =>
      prev.map((img) => ({
        ...img,
        is_cover: img.storage_path === storagePath,
      }))
    );
    setIsDirty(true);
  };

  const handleMoveImage = (index: number, direction: "prev" | "next") => {
    setImages((prev) => {
      const targetIndex = direction === "prev" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const copy = [...prev];
      const currentItem = copy[index];
      const swapItem = copy[targetIndex];
      if (!currentItem || !swapItem) return prev;

      copy[index] = swapItem;
      copy[targetIndex] = currentItem;

      return copy.map((item, idx) => ({ ...item, sort_order: idx }));
    });
    setIsDirty(true);
  };

  const handleCaptionChange = (storagePath: string, caption: string) => {
    setImages((prev) =>
      prev.map((img) =>
        img.storage_path === storagePath ? { ...img, caption } : img
      )
    );
    setIsDirty(true);
  };

  const handleDeleteImage = async (target: AdminDraftImage) => {
    setImages((prev) => {
      const filtered = prev.filter(
        (img) => img.storage_path !== target.storage_path
      );
      if (filtered.length > 0 && !filtered.some((img) => img.is_cover)) {
        const first = filtered[0];
        if (first) {
          filtered[0] = { ...first, is_cover: true };
        }
      }
      return filtered.map((img, idx) => ({ ...img, sort_order: idx }));
    });
    setIsDirty(true);

    if (!target.persisted) {
      try {
        await fetch("/api/admin/upload", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storage_path: target.storage_path }),
        });
      } catch {
        // Best-effort draft storage cleanup
      }
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (pendingUploads.length > 0) {
      setFeedback({
        kind: "error",
        text: "사진 업로드가 끝난 뒤 저장해 주세요.",
      });
      return;
    }

    if (form.name.trim().length === 0) {
      setFieldErrors({ name: ["업체명을 입력해 주세요."] });
      setFeedback({ kind: "error", text: "업체명을 입력해 주세요." });
      setMobileTab("form");
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    setFieldErrors({});

    const payload = {
      name: form.name.trim(),
      status: form.status,
      region: form.region.trim(),
      address: form.address.trim(),
      venue_distance_note: form.venue_distance_note.trim(),
      service_type: form.service_type,
      price_summary: form.price_summary.trim(),
      parking_info: form.parking_info.trim(),
      business_hours: form.business_hours.trim(),
      highlights: form.highlights,
      pros: form.pros.trim(),
      cons: form.cons.trim(),
      summary_note: form.summary_note.trim(),
      naver_map_url: form.naver_map_url.trim() || null,
      instagram_url: form.instagram_url.trim() || null,
      raw_source_text: form.raw_source_text.trim() || null,
      images: images.map((img, idx) => ({
        storage_path: img.storage_path,
        public_url: img.public_url,
        caption: img.caption.trim(),
        is_cover: img.is_cover,
        sort_order: idx,
      })),
    };

    try {
      const isEditing = selectedShopId !== null;
      const endpoint = isEditing
        ? `/api/admin/shops/${selectedShopId}`
        : "/api/admin/shops";

      const res = await fetch(endpoint, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = (await res.json().catch(() => null)) as {
        shop?: AdminShopDetailDTO;
        error?: { message?: string; details?: Record<string, string[]> };
      } | null;

      if (!res.ok || !data?.shop) {
        if (data?.error?.details) {
          setFieldErrors(data.error.details);
        }
        setFeedback({
          kind: "error",
          text:
            data?.error?.message ?? "업체 정보를 저장하지 못했습니다.",
        });
        return;
      }

      const savedShop = data.shop;
      const loaded = shopDtoToFormState(savedShop);

      setShops((prev) => {
        const exists = prev.some((s) => s.id === savedShop.id);
        if (exists) {
          return [
            savedShop,
            ...prev.filter((s) => s.id !== savedShop.id),
          ];
        }
        return [savedShop, ...prev];
      });
      setSelectedShopId(savedShop.id);
      setForm(loaded.form);
      setImages(loaded.images);
      setIsDirty(false);
      setFeedback({
        kind: "success",
        text: isEditing
          ? `"${savedShop.name}" 수정 내용이 저장되었어요.`
          : `"${savedShop.name}" 업체가 새로 등록되었어요.`,
      });
    } catch {
      setFeedback({
        kind: "error",
        text: "네트워크 오류가 발생했습니다. 다시 시도해 주세요.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedShopId || isDeleting) return;

    setIsDeleting(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/shops/${selectedShopId}`, {
        method: "DELETE",
      });

      if (res.status === 401) {
        setShowDeleteModal(false);
        handleUnauthorized();
        return;
      }

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setShowDeleteModal(false);
        setFeedback({
          kind: "error",
          text: data?.error?.message ?? "업체를 삭제하지 못했습니다.",
        });
        return;
      }

      const deletedName = form.name || "선택한 업체";
      setShops((prev) => prev.filter((s) => s.id !== selectedShopId));
      setSelectedShopId(null);
      setForm(createEmptyFormState());
      setImages([]);
      setFieldErrors({});
      setIsDirty(false);
      setShowDeleteModal(false);
      setFeedback({
        kind: "success",
        text: `"${deletedName}" 업체와 관련 사진이 삭제되었어요.`,
      });
    } catch {
      setShowDeleteModal(false);
      setFeedback({
        kind: "error",
        text: "삭제 중 네트워크 오류가 발생했습니다.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = async () => {
    if (!confirmDiscardIfDirty()) return;
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
    } catch {
      // Ignore network errors and transition back to PIN gate
    }
    onLoggedOut();
  };

  return (
    <div className="min-h-[100dvh] bg-canvas-mobile md:bg-canvas-desktop pb-12 safe-bottom">
      <header className="sticky top-0 z-30 safe-top bg-canvas-mobile/95 backdrop-blur-md border-b border-border">
        <div className="max-w-[1120px] mx-auto px-4 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-card-title text-text-primary">
              혼주 룩북 관리자
            </h1>
            {isDirty && (
              <span className="px-2.5 py-1 rounded-full bg-accent-gold-tint text-accent-gold-text text-caption">
                수정 중
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleStartNewShop}
              className="min-h-[48px] px-3.5 py-2 rounded-xl bg-accent-gold-tint border border-accent-gold text-accent-gold-text text-control inline-flex items-center gap-1.5 hover:bg-accent-gold/15 cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>새 업체 등록</span>
            </button>

            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[48px] px-3.5 py-2 rounded-xl bg-surface border border-border-strong text-control text-text-primary inline-flex items-center gap-1.5 hover:bg-surface-subtle"
            >
              <span>룩북 열기</span>
              <ExternalLink className="w-4 h-4 shrink-0" aria-hidden="true" />
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="min-h-[48px] px-3.5 py-2 rounded-xl bg-surface border border-border-strong text-control text-text-secondary inline-flex items-center gap-1.5 hover:bg-surface-subtle hover:text-text-primary cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1120px] mx-auto px-4 md:px-6 pt-5 space-y-5">
        <AdminShopListBar
          shops={shops}
          selectedShopId={selectedShopId}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onSelectShop={handleSelectShop}
          onStartNewShop={handleStartNewShop}
        />

        {feedback && (
          <div
            role={feedback.kind === "error" ? "alert" : "status"}
            className={`px-4 py-3.5 rounded-2xl border text-body flex items-center gap-2.5 ${
              feedback.kind === "success"
                ? "bg-accent-sage-tint border-accent-sage/40 text-accent-sage-text"
                : "bg-accent-rose-tint border-accent-rose/40 text-danger"
            }`}
          >
            {feedback.kind === "success" && (
              <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Mobile Tab Switcher */}
        <div className="grid grid-cols-2 gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setMobileTab("form")}
            aria-pressed={mobileTab === "form"}
            className={`min-h-[48px] px-4 py-2.5 rounded-2xl border text-control cursor-pointer transition-colors ${
              mobileTab === "form"
                ? "bg-text-primary border-text-primary text-surface"
                : "bg-surface border-border-strong text-text-secondary"
            }`}
          >
            정보 입력
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("photos")}
            aria-pressed={mobileTab === "photos"}
            className={`min-h-[48px] px-4 py-2.5 rounded-2xl border text-control cursor-pointer transition-colors ${
              mobileTab === "photos"
                ? "bg-text-primary border-text-primary text-surface"
                : "bg-surface border-border-strong text-text-secondary"
            }`}
          >
            사진 관리 ({images.length})
          </button>
        </div>

        {/* Desktop 2-Column Workbench / Mobile Tabbed Panes */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left Column: AI Parser + Form + Save/Delete Bar */}
          <div
            className={`md:col-span-7 space-y-5 ${
              mobileTab === "form" ? "block" : "hidden md:block"
            }`}
          >
            <AiTextParserBox
              rawText={form.raw_source_text}
              onRawTextChange={(next) =>
                handleFieldChange("raw_source_text", next)
              }
              onParsed={handleAiParsed}
              onUnauthorized={handleUnauthorized}
            />

            <AdminShopForm
              form={form}
              fieldErrors={fieldErrors}
              onChange={handleFieldChange}
            />

            <div className="editorial-card rounded-2xl p-4 md:p-5 flex flex-wrap items-center justify-between gap-3">
              {selectedShopId ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={isSaving || isDeleting}
                  className="min-h-[52px] px-4 py-2.5 rounded-2xl border border-accent-rose/40 bg-surface text-control text-danger inline-flex items-center gap-2 hover:bg-accent-rose-tint disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>업체 삭제</span>
                </button>
              ) : (
                <span className="text-caption text-text-secondary">
                  저장하면 가족 룩북 목록에 바로 반영돼요.
                </span>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isDeleting || pendingUploads.length > 0}
                className="min-h-[52px] px-6 py-2.5 rounded-2xl bg-text-primary text-surface text-control inline-flex items-center justify-center gap-2 hover:bg-text-primary/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ml-auto"
              >
                {isSaving ? (
                  <>
                    <Loader2
                      className="w-5 h-5 animate-spin shrink-0"
                      aria-hidden="true"
                    />
                    <span>저장하는 중...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 shrink-0" aria-hidden="true" />
                    <span>
                      {selectedShopId ? "수정 내용 저장하기" : "새 업체 저장하기"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Sticky Clipboard Image Dropzone & Gallery Manager */}
          <aside
            className={`md:col-span-5 md:sticky md:top-[84px] space-y-4 editorial-card rounded-2xl p-5 ${
              mobileTab === "photos" ? "block" : "hidden md:block"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-section-title text-text-primary">
                  3. 참고 사진 관리 ({images.length}장)
                </h2>
                <p className="text-caption text-text-secondary mt-0.5">
                  대표 사진 1장은 목록 카드 썸네일로 표시돼요.
                </p>
              </div>
            </div>

            <ClipboardImageUploader
              currentImageCount={images.length + pendingUploads.length}
              onStartUpload={handleStartUpload}
              onFinishUpload={handleFinishUpload}
              onUnauthorized={handleUnauthorized}
            />

            <AdminGalleryManager
              images={images}
              pendingUploads={pendingUploads}
              onSetCover={handleSetCover}
              onMove={handleMoveImage}
              onCaptionChange={handleCaptionChange}
              onDelete={handleDeleteImage}
            />

            {/* Mobile Save shortcut when viewing the Photos tab */}
            <div className="md:hidden pt-3 border-t border-border">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isDeleting || pendingUploads.length > 0}
                className="w-full min-h-[52px] px-5 py-2.5 rounded-2xl bg-text-primary text-surface text-control inline-flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2
                      className="w-5 h-5 animate-spin shrink-0"
                      aria-hidden="true"
                    />
                    <span>저장하는 중...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 shrink-0" aria-hidden="true" />
                    <span>
                      {selectedShopId ? "수정 내용 저장하기" : "새 업체 저장하기"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </aside>
        </div>
      </main>

      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F1D1A]/45 backdrop-blur-[2px] px-4 overscroll-contain"
          onClick={() => !isDeleting && setShowDeleteModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-shop-dialog-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[420px] editorial-card rounded-3xl p-6 space-y-4"
          >
            <h2
              id="delete-shop-dialog-title"
              className="font-serif text-section-title text-text-primary"
            >
              업체를 삭제할까요?
            </h2>
            <p className="text-body text-text-secondary">
              <strong className="text-text-primary">
                {form.name || "이 업체"}
              </strong>
              의 정보, 가족 찜, 의견, 업로드된 참고 사진이 모두 삭제되며 되돌릴 수 없어요.
            </p>
            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="min-h-[48px] px-5 py-2 rounded-xl border border-border-strong bg-surface text-control text-text-primary hover:bg-surface-subtle cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="min-h-[48px] px-5 py-2 rounded-xl bg-danger text-surface text-control inline-flex items-center gap-2 hover:bg-danger/90 disabled:opacity-60 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2
                      className="w-4 h-4 animate-spin shrink-0"
                      aria-hidden="true"
                    />
                    <span>삭제 중...</span>
                  </>
                ) : (
                  <span>네, 삭제할게요</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
