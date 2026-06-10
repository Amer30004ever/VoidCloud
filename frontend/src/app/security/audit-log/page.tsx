"use client";
import { History } from "lucide-react";
import { ResourcePage } from "@/components/common/ResourcePage";

export default function AuditLogPage() {
  return (
    <ResourcePage
      storageKey="amer.audit"
      title="Audit Log"
      subtitle="Who did what, when (client-side ledger)."
      icon={<History className="h-6 w-6 text-primary" />}
      searchKeys={["actor", "action", "resource"]}
      fields={[
        { name: "actor", label: "Actor", required: true },
        { name: "action", label: "Action", required: true },
        { name: "resource", label: "Resource" },
        { name: "details", label: "Details", type: "textarea" },
      ]}
    />
  );
}
