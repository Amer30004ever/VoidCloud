"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
export default function R() {
  const r = useRouter();
  const { id } = useParams<{ id: string }>();
  useEffect(() => { r.replace(`/amercloud/dashboard/vps/${id}`); }, [r, id]);
  return null;
}
