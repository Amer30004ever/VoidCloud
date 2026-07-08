"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DevopsIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/devops/login");
  }, [router]);
  return null;
}
