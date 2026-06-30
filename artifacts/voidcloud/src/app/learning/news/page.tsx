
import { useEffect } from "react";
import { useRouter } from "@/compat/next-navigation";

export default function NewsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/learning?tab=news");
  }, [router]);

  return null;
}
