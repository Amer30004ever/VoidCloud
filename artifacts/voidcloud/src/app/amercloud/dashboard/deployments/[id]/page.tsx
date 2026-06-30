import { useEffect } from "react";
import { useParams } from "wouter";
import { useRouter } from "@/compat/next-navigation";
export default function R() {
  const r = useRouter();
  const { id } = useParams<{ id: string }>();
  useEffect(() => { r.replace(`/amercloud/dashboard/vps/${id}`); }, [r, id]);
  return null;
}
