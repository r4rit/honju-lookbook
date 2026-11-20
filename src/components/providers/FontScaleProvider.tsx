"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { FontScale } from "@/types/shop";

const STORAGE_KEY = "honju_font_scale";

interface FontScaleContextValue {
  scale: FontScale;
  isLarge: boolean;
  setScale: (scale: FontScale) => void;
  toggleScale: () => void;
}

const FontScaleContext = createContext<FontScaleContextValue | null>(null);

const listeners = new Set<() => void>();

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      applyHtmlAttribute(readStoredScale());
      callback();
    }
  };

  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", handleStorage);
  };
}

function readStoredScale(): FontScale {
  if (typeof window === "undefined") return "normal";
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "large"
      ? "large"
      : "normal";
  } catch {
    return "normal";
  }
}

function getServerSnapshot(): FontScale {
  return "normal";
}

function applyHtmlAttribute(scale: FontScale): void {
  if (typeof document === "undefined") return;
  if (scale === "large") {
    document.documentElement.setAttribute("data-font-scale", "large");
  } else {
    document.documentElement.removeAttribute("data-font-scale");
  }
}

export function FontScaleProvider({ children }: { children: ReactNode }) {
  const scale = useSyncExternalStore(
    subscribe,
    readStoredScale,
    getServerSnapshot
  );

  const setScale = useCallback((next: FontScale) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage errors in private browsing contexts
    }
    applyHtmlAttribute(next);
    notifyListeners();
  }, []);

  const toggleScale = useCallback(() => {
    const current = readStoredScale();
    setScale(current === "large" ? "normal" : "large");
  }, [setScale]);

  return (
    <FontScaleContext.Provider
      value={{
        scale,
        isLarge: scale === "large",
        setScale,
        toggleScale,
      }}
    >
      {children}
    </FontScaleContext.Provider>
  );
}

export function useFontScale(): FontScaleContextValue {
  const ctx = useContext(FontScaleContext);
  if (!ctx) {
    throw new Error("useFontScale must be used within FontScaleProvider");
  }
  return ctx;
}
