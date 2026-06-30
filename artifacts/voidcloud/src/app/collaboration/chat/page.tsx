
import { useEffect } from "react";
import { useRouter } from "@/compat/next-navigation";

export default function ChatRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/collaboration?tab=chat");
  }, [router]);

  return null;
}
