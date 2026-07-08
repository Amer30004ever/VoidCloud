"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/voidcloud/login");
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
      Redirecting to VoidCloud loginâ€¦
    </div>
  );
}
