"use client";

import { useAuth } from "@/features/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingState } from "@workspace/ui-kit/loading-state";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/voidcloud/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) return <LoadingState message="Authenticating..." />;
  if (!user) return null;

  return <>{children}</>;
}
