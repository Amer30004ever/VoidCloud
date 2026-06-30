
import { useEffect } from "react";
import { useRouter } from "@/compat/next-navigation";

export default function ScriptsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/automation?tab=scripts");
  }, [router]);

  return null;
}
