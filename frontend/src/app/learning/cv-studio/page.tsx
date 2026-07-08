"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CVStudioRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/learning?tab=cv-studio");
  }, [router]);

  return null;
}
