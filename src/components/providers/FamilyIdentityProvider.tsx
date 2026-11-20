"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { FAMILY_ROLES, type FamilyRole } from "@/types/shop";

const STORAGE_KEY = "honju_family_role";

interface FamilyIdentityContextValue {
  role: FamilyRole | null;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  selectRole: (role: FamilyRole) => void;
  clearRole: () => void;
  requireRole: (onSelected: (role: FamilyRole) => void) => void;
}

const FamilyIdentityContext =
  createContext<FamilyIdentityContextValue | null>(null);

const listeners = new Set<() => void>();

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

function isFamilyRole(value: string | null): value is FamilyRole {
  return (
    value !== null && (FAMILY_ROLES as readonly string[]).includes(value)
  );
}

function readStoredRole(): FamilyRole | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isFamilyRole(raw) ? raw : null;
  } catch {
    return null;
  }
}

function getServerSnapshot(): FamilyRole | null {
  return null;
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      callback();
    }
  };

  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", handleStorage);
  };
}

export function FamilyIdentityProvider({
  children,
}: {
  children: ReactNode;
}) {
  const role = useSyncExternalStore(
    subscribe,
    readStoredRole,
    getServerSnapshot
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const pendingCallbackRef = useRef<((selected: FamilyRole) => void) | null>(
    null
  );

  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    pendingCallbackRef.current = null;
    setIsModalOpen(false);
  }, []);

  const selectRole = useCallback((nextRole: FamilyRole) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, nextRole);
    } catch {
      // Ignore storage errors in restricted contexts
    }
    notifyListeners();
    setIsModalOpen(false);

    const pending = pendingCallbackRef.current;
    pendingCallbackRef.current = null;
    if (pending) {
      pending(nextRole);
    }
  }, []);

  const clearRole = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors in restricted contexts
    }
    notifyListeners();
    pendingCallbackRef.current = null;
    setIsModalOpen(false);
  }, []);

  const requireRole = useCallback(
    (onSelected: (selected: FamilyRole) => void) => {
      const current = readStoredRole();
      if (current) {
        onSelected(current);
        return;
      }
      pendingCallbackRef.current = onSelected;
      setIsModalOpen(true);
    },
    []
  );

  return (
    <FamilyIdentityContext.Provider
      value={{
        role,
        isModalOpen,
        openModal,
        closeModal,
        selectRole,
        clearRole,
        requireRole,
      }}
    >
      {children}
    </FamilyIdentityContext.Provider>
  );
}

export function useFamilyIdentity(): FamilyIdentityContextValue {
  const ctx = useContext(FamilyIdentityContext);
  if (!ctx) {
    throw new Error(
      "useFamilyIdentity must be used within FamilyIdentityProvider"
    );
  }
  return ctx;
}
