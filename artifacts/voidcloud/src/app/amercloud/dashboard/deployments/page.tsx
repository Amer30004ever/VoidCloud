import { useEffect } from "react";
import { useRouter } from "@/compat/next-navigation";
export default function R() {
  const r = useRouter();
  useEffect(() => { r.replace("/amercloud/dashboard/vps"); }, [r]);
  return null;
}
