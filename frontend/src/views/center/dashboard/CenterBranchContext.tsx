'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export interface CenterBranch {
  id: string;
  name: string;
}

interface CenterBranchContextValue {
  branches: CenterBranch[];
  branchId: string;
  setBranches: (branches: CenterBranch[]) => void;
  setBranchId: (id: string) => void;
}

const STORAGE_KEY = 'maarej.centerBranchId';

const CenterBranchContext = createContext<CenterBranchContextValue | null>(null);

export function CenterBranchProvider({ children }: { children: ReactNode }) {
  const [branches, setBranchesState] = useState<CenterBranch[]>([]);
  const [branchId, setBranchIdState] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      return window.localStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  const setBranches = useCallback((next: CenterBranch[]) => {
    setBranchesState(next);
    setBranchIdState((current) => {
      if (current && !next.some((b) => b.id === current)) return '';
      return current;
    });
  }, []);

  const setBranchId = useCallback((id: string) => {
    setBranchIdState(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore storage errors */
    }
  }, []);

  return (
    <CenterBranchContext.Provider value={{ branches, branchId, setBranches, setBranchId }}>
      {children}
    </CenterBranchContext.Provider>
  );
}

export function useCenterBranch(): CenterBranchContextValue {
  const ctx = useContext(CenterBranchContext);
  if (!ctx) {
    throw new Error('useCenterBranch must be used within CenterBranchProvider');
  }
  return ctx;
}