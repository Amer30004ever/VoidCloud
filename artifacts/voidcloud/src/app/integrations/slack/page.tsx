
import { useEffect } from "react";
import { useRouter } from "@/compat/next-navigation";

export default function SlackRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/integrations?tab=slack");
  }, [router]);

  return null;
}
