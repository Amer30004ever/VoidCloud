"use client";
import { ShieldCheck } from "lucide-react";
import { ResourcePage } from "@/components/common/ResourcePage";

export default function SslMonitorPage() {
  return (
    <ResourcePage
      storageKey="amer.ssl"
      title="SSL Monitor"
      subtitle="TLS certificate expiry tracking."
      icon={<ShieldCheck className="h-6 w-6 text-primary" />}
      searchKeys={["host", "issuer"]}
      fields={[
        { name: "host", label: "Host", required: true, placeholder: "api.example.com" },
        { name: "issuer", label: "Issuer", placeholder: "Let's Encrypt" },
        { name: "expiresAt", label: "Expires", type: "date", required: true },
        { name: "notes", label: "Notes" },
      ]}
    />
  );
}
