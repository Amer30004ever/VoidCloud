
import { useEffect } from "react";
import { useRouter } from "@/compat/next-navigation";

export default function PortalRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
      Opening DevOps portal…
    </div>
  );
}
