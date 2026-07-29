"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/features/auth/AuthContext";

interface ImpersonationState {
  active: boolean;
  targetName: string | null;
  targetEmail: string | null;
}

interface ImpersonationContextType extends ImpersonationState {
  setImpersonation: (state: ImpersonationState) => void;
  clear: () => void;
}

const ImpersonationContext = createContext<ImpersonationContextType>({
  active: false,
  targetName: null,
  targetEmail: null,
  setImpersonation: () => {},
  clear: () => {},
});

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<ImpersonationState>({ active: false, targetName: null, targetEmail: null });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem("impersonation");
    if (raw) {
      try { setState(JSON.parse(raw)); } catch {}
    }
  }, [user?.id]);

  const setImpersonation = (next: ImpersonationState) => {
    setState(next);
    if (typeof window !== "undefined") {
      if (next.active) sessionStorage.setItem("impersonation", JSON.stringify(next));
      else sessionStorage.removeItem("impersonation");
    }
  };

  const clear = () => {
    setState({ active: false, targetName: null, targetEmail: null });
    if (typeof window !== "undefined") sessionStorage.removeItem("impersonation");
  };

  return (
    <ImpersonationContext.Provider value={{ ...state, setImpersonation, clear }}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  return useContext(ImpersonationContext);
}
