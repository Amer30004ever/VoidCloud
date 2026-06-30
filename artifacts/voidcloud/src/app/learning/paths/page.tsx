
import { useEffect } from "react";
import { useRouter } from "@/compat/next-navigation";

export default function PathsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/learning?tab=paths");
  }, [router]);

  return null;
}
