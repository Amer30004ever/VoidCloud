"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function JobsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/learning?tab=jobs");
  }, [router]);

  return null;
}
