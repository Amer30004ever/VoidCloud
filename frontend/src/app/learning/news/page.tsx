"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/learning?tab=news");
  }, [router]);

  return null;
}
