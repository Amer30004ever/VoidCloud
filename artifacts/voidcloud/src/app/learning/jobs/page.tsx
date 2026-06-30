
import { useEffect } from "react";
import { useRouter } from "@/compat/next-navigation";

export default function JobsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/learning?tab=jobs");
  }, [router]);

  return null;
}
