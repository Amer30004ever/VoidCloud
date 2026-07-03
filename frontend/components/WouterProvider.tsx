"use client";

import { Router } from "wouter";
import { useLocation } from "wouter";

export function WouterProvider({ children }: { children: React.ReactNode }) {
  return (
    <Router>
      {children}
    </Router>
  );
}
