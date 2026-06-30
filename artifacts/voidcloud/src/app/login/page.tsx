
import { useEffect } from "react";
import { useRouter } from "@/compat/next-navigation";

export default function LoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/amercloud/login");
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
      Redirecting to AmerCloud login…
    </div>
  );
}
