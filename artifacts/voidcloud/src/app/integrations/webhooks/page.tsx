
import { useEffect } from "react";
import { useRouter } from "@/compat/next-navigation";

export default function WebhooksRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/integrations?tab=webhooks");
  }, [router]);

  return null;
}
