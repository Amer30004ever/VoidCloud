
import { useEffect } from "react";
import { useRouter } from "@/compat/next-navigation";

export default function CVStudioRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/learning?tab=cv-studio");
  }, [router]);

  return null;
}
